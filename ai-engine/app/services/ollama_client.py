
import logging

import requests

from app.config import OLLAMA_BASE_URL, OLLAMA_MODEL

logger = logging.getLogger(__name__)


def generate_response(prompt: str) -> str:
    if not prompt or not prompt.strip():
        raise ValueError("Prompt cannot be empty.")

    url = f"{OLLAMA_BASE_URL}/api/generate"

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }

    try:
        response = requests.post(
            url,
            json=payload,
            timeout=300,
        )
        response.raise_for_status()

        result = response.json()
        answer = result.get("response", "")

        if not isinstance(answer, str) or not answer.strip():
            raise RuntimeError("Ollama returned an empty response.")

        return answer.strip()

    except requests.RequestException:
        logger.exception("Ollama API request failed.")
        raise
