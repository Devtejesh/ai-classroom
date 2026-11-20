
import base64
import logging
import os

from google import genai

from app.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)

TTS_MODEL = os.getenv(
    "TTS_MODEL",
    "gemini-3.8-flash-lite-tts",
)

# TTS requires the v1beta API.
tts_client = genai.Client(
    api_key=GEMINI_API_KEY,
    http_options={"api_version": "v1beta"},
)


def generate_speech(
    text: str,
    voice: str = "Kore",
) -> bytes:

    if not text or not text.strip():
        raise ValueError("Text cannot be empty.")

    try:
        interaction = tts_client.interactions.create(
            model=TTS_MODEL,
            input=[
                {
                    "type": "user_input",
                    "content": [
                        {
                            "type": "text",
                            "text": text.strip(),
                            "annotations": [
                                {
                                    "type": "speech_metadata",
                                    "style": "warm, friendly, clear "
                                             "and natural teacher voice",
                                }
                            ],
                        }
                    ],
                }
            ],
            response_format={"type": "audio"},
            generation_config={
                "speech_config": [
                    {"voice": voice}
                ]
            },
        )

        audio_data = interaction.output_audio

        if not audio_data or not audio_data.data:
            raise RuntimeError("TTS returned empty audio.")

        return base64.b64decode(audio_data.data)

    except Exception:
        logger.exception("Speech generation failed.")
        raise
