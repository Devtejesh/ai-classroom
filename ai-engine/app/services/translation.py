
import json
import logging
import re

from app.services.llm import generate_response

logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = {
    "hi": "Hindi",
    "en": "English",
    "te": "Telugu",
}

BATCH_SIZE = 3
MAX_RETRIES = 2


def parse_model_response(response: str) -> list:
    """Extract the first valid JSON array from Ollama response."""

    cleaned = response.strip()

    # Remove Markdown code fences.
    cleaned = re.sub(
        r"^```(?:json)?\s*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"\s*```$", "", cleaned)

    decoder = json.JSONDecoder()

    # Find and decode the first complete JSON array.
    for position, character in enumerate(cleaned):
        if character != "[":
            continue

        try:
            result, _ = decoder.raw_decode(cleaned[position:])

            if isinstance(result, list):
                return result

        except json.JSONDecodeError:
            continue

    raise ValueError(
        "Ollama did not return a valid JSON array."
    )


def translate_batch(
    segments: list[dict],
    source_language: str,
    target_language: str,
) -> list[dict]:

    source_name = SUPPORTED_LANGUAGES.get(
        source_language,
        source_language,
    )
    target_name = SUPPORTED_LANGUAGES[target_language]

    translated_segments = []

    for segment in segments:
        original_text = segment["text"]

        prompt = f"""
Translate the following text from {source_name} to {target_name}.

Rules:
1. Translate accurately and naturally.
2. Preserve the original meaning.
3. Return only the translated text.
4. Do not explain anything.
5. Do not return JSON or numbering.

Text:
{original_text}

Translation:
"""

        translated_text = generate_response(prompt).strip()

        if not translated_text:
            raise ValueError("Ollama returned an empty translation.")

        translated_segments.append({
            **segment,
            "text": translated_text,
        })

    return translated_segments



def translate_with_fallback(
    segments: list[dict],
    source_language: str,
    target_language: str,
) -> list[dict]:
    """Translate batches and preserve original text for failed segments."""

    for attempt in range(MAX_RETRIES):
        try:
            translated = translate_batch(
                segments,
                source_language,
                target_language,
            )

            return [
                {**segment, "translation_status": "translated"}
                for segment in translated
            ]

        except Exception:
            logger.exception(
                "Translation failed. Attempt %s/%s for %s segments.",
                attempt + 1,
                MAX_RETRIES,
                len(segments),
            )

    if len(segments) == 1:
        logger.warning(
            "Keeping original text for failed segment: %s",
            segments[0].get("text", "")[:100],
        )

        return [
            {
                **segments[0],
                "translation_status": "untranslated",
            }
        ]

    midpoint = len(segments) // 2

    logger.warning(
        "Splitting failed batch of %s segments.",
        len(segments),
    )

    first_half = translate_with_fallback(
        segments[:midpoint],
        source_language,
        target_language,
    )

    second_half = translate_with_fallback(
        segments[midpoint:],
        source_language,
        target_language,
    )

    return first_half + second_half



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
        raise ValueError("Transcript segments cannot be empty.")

    translated_segments = []

    for start in range(0, len(segments), BATCH_SIZE):
        batch = segments[start:start + BATCH_SIZE]

        translated_batch = translate_with_fallback(
            batch,
            source_language,
            target_language,
        )

        translated_segments.extend(translated_batch)

    return translated_segments
