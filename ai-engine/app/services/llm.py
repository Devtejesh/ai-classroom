
import logging
import time

from google import genai
from google.genai import types
from groq import Groq

from app.config import (
    AI_PROVIDER,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GROQ_API_KEY,
    GROQ_MODEL,
)

logger = logging.getLogger(__name__)


def generate_with_gemini(prompt: str) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("Gemini API key is not configured.")

    client = genai.Client(
        api_key=GEMINI_API_KEY,
        http_options=types.HttpOptions(timeout=180000),
    )

    try:
        logger.info("Gemini request started | model=%s", GEMINI_MODEL)

        interaction = client.interactions.create(
            model=GEMINI_MODEL,
            input=prompt,
        )

        answer = interaction.output_text

        if not answer or not answer.strip():
            raise RuntimeError("Gemini returned an empty response.")

        return answer.strip()

    finally:
        client.close()


def generate_with_groq(prompt: str) -> str:
    if not GROQ_API_KEY:
        raise RuntimeError("Groq API key is not configured.")

    client = Groq(
        api_key=GROQ_API_KEY,
        timeout=60.0,
    )

    logger.info("Groq request started | model=%s", GROQ_MODEL)

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        temperature=0.4,
    )

    answer = response.choices[0].message.content

    if not answer or not answer.strip():
        raise RuntimeError("Groq returned an empty response.")

    return answer.strip()


def generate_response(prompt: str) -> str:
    if not prompt or not prompt.strip():
        raise ValueError("Prompt cannot be empty.")

    prompt = prompt.strip()
    start_time = time.monotonic()

    providers = {
        "gemini": generate_with_gemini,
        "groq": generate_with_groq,
    }

    provider_order = [
        AI_PROVIDER,
        *[
            provider
            for provider in providers
            if provider != AI_PROVIDER
        ],
    ]

    errors = []

    for provider in provider_order:
        try:
            logger.info("Attempting LLM provider: %s", provider)

            answer = providers[provider](prompt)

            elapsed = time.monotonic() - start_time

            logger.info(
                "LLM response successful | provider=%s | duration=%.2fs",
                provider,
                elapsed,
            )

            return answer

        except Exception as error:
            elapsed = time.monotonic() - start_time

            logger.exception(
                "LLM provider failed | provider=%s | duration=%.2fs",
                provider,
                elapsed,
            )

            errors.append(f"{provider}: {error}")

    raise RuntimeError(
        "All configured LLM providers failed. "
        + " | ".join(errors)
    )
