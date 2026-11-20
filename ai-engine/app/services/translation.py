
import json
import logging
import re
import threading
import time

from google import genai

from app.config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger(__name__)

client = genai.Client(api_key=GEMINI_API_KEY)

SUPPORTED_LANGUAGES = {
    "hi": "Hindi",
    "en": "English",
    "te": "Telugu",
}

BATCH_SIZE = 10
REQUEST_INTERVAL = 4.6

_request_lock = threading.Lock()
_last_request_time = 0.0


class GeminiOutputError(Exception):
    """Gemini returned an empty or invalid response."""


class IncompleteTranslationError(Exception):
    """Gemini did not translate every requested segment."""


def get_error_status(error: Exception):
    return (
        getattr(error, "code", None)
        or getattr(error, "status_code", None)
    )


def is_temporary_api_error(error: Exception) -> bool:
    status_code = get_error_status(error)
    error_text = str(error).upper()

    return (
        status_code in (429, 503)
        or "429" in error_text
        or "503" in error_text
        or "RESOURCE_EXHAUSTED" in error_text
        or "UNAVAILABLE" in error_text
    )


def generate_with_retry(prompt: str):
    global _last_request_time

    max_attempts = 5

    for attempt in range(max_attempts):
        try:
            with _request_lock:
                elapsed = time.monotonic() - _last_request_time

                if elapsed < REQUEST_INTERVAL:
                    time.sleep(REQUEST_INTERVAL - elapsed)

                try:
                    response = client.models.generate_content(
                        model=GEMINI_MODEL,
                        contents=prompt,
                    )
                finally:
                    _last_request_time = time.monotonic()

            return response

        except Exception as error:
            if not is_temporary_api_error(error):
                raise

            if attempt == max_attempts - 1:
                logger.exception("Gemini API retries exhausted.")
                raise

            delay = min(5 * (2 ** attempt), 60)

            logger.warning(
                "Gemini temporary API error: %s. "
                "Retrying in %s seconds (%s/%s).",
                get_error_status(error),
                delay,
                attempt + 1,
                max_attempts,
            )

            time.sleep(delay)

    raise RuntimeError("Gemini request failed after retries")


def parse_gemini_json(response):
    if response is None:
        raise GeminiOutputError("Gemini returned no response.")

    response_text = getattr(response, "text", None)

    if not response_text or not response_text.strip():
        raise GeminiOutputError("Gemini returned an empty response.")

    cleaned_text = response_text.strip()

    # Handle JSON wrapped in Markdown code fences.
    cleaned_text = re.sub(
        r"^```(?:json)?\s*",
        "",
        cleaned_text,
        flags=re.IGNORECASE,
    )
    cleaned_text = re.sub(r"\s*```$", "", cleaned_text)

    try:
        result = json.loads(cleaned_text)
    except json.JSONDecodeError as error:
        raise GeminiOutputError(
            "Gemini returned invalid JSON."
        ) from error

    if not isinstance(result, list):
        raise GeminiOutputError(
            "Gemini response must be a JSON array."
        )

    return result


def translate_batch(
    segments: list[dict],
    source_language: str,
    target_language: str,
) -> list[dict]:

    target_name = SUPPORTED_LANGUAGES[target_language]

    translated_texts = {}
    pending_segments = list(enumerate(segments))

    # Initial attempt + 2 retries for missing/invalid output.
    for attempt in range(3):

        if not pending_segments:
            break

        indexed_texts = [
            {
                "index": original_index,
                "text": segment["text"],
            }
            for original_index, segment in pending_segments
        ]

        prompt = f"""
You are a professional subtitle translator.

Source language: {source_language}
Target language: {target_name}

Translate EVERY input segment into {target_name}.

Rules:
- Translate every segment.
- Do not skip any segment.
- Do not combine segments.
- Preserve every index exactly.
- Return one translation for every input index.
- Do not summarize.
- Do not add explanations.
- Return only a valid JSON array.

Input:
{json.dumps(indexed_texts, ensure_ascii=False)}

Required output format:
[
  {{"index": 0, "text": "translated text"}}
]
"""

        response = generate_with_retry(prompt)

        try:
            result = parse_gemini_json(response)
        except GeminiOutputError:
            logger.warning(
                "Gemini returned empty/invalid JSON. Retry %s/2.",
                attempt + 1,
            )
            continue

        for item in result:

            if not isinstance(item, dict):
                continue

            index = item.get("index")
            translated_text = item.get("text")

            pending_indexes = {
                original_index
                for original_index, _ in pending_segments
            }

            if (
                isinstance(index, int)
                and isinstance(translated_text, str)
                and translated_text.strip()
                and index in pending_indexes
            ):
                translated_texts[index] = translated_text.strip()

        pending_segments = [
            (original_index, segment)
            for original_index, segment in pending_segments
            if original_index not in translated_texts
        ]

        if pending_segments:
            logger.warning(
                "Gemini missed %s segments. Retry %s/2.",
                len(pending_segments),
                attempt + 1,
            )

    if pending_segments:
        # If no usable response was received, don't split the batch.
        if not translated_texts:
            raise GeminiOutputError(
                "Gemini repeatedly returned empty or invalid output."
            )

        missing = [
            index for index, _ in pending_segments
        ]

        raise IncompleteTranslationError(
            f"Gemini missed translation segments: {missing}"
        )

    return [
        {
            "start": original["start"],
            "end": original["end"],
            "text": translated_texts[index],
        }
        for index, original in enumerate(segments)
    ]


def translate_segments(
    segments: list[dict],
    source_language: str,
    target_language: str,
) -> list[dict]:

    if target_language not in SUPPORTED_LANGUAGES:
        raise ValueError(
            f"Unsupported target language: {target_language}"
        )

    if not segments:
        return []

    translated_segments = []

    for batch_start in range(0, len(segments), BATCH_SIZE):

        batch = segments[batch_start:batch_start + BATCH_SIZE]

        try:
            translated = translate_batch(
                batch,
                source_language,
                target_language,
            )

            translated_segments.extend(translated)

        except (GeminiOutputError, IncompleteTranslationError) as error:

            # Do not split batches for empty/invalid responses.
            if isinstance(error, GeminiOutputError):
                raise

            logger.warning(
                "Incomplete translation in batch starting at %s. "
                "Splitting batch.",
                batch_start,
            )

            if len(batch) == 1:
                raise

            middle = len(batch) // 2

            first_half = translate_segments(
                batch[:middle],
                source_language,
                target_language,
            )

            second_half = translate_segments(
                batch[middle:],
                source_language,
                target_language,
            )

            translated_segments.extend(first_half)
            translated_segments.extend(second_half)

        except Exception as error:

            # 429 and 503 are temporary API problems.
            # Never split batches for these errors.
            if is_temporary_api_error(error):
                raise

            raise

    return translated_segments
