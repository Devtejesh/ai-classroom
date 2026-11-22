
import base64
import logging

from app.config import GEMINI_API_KEY, TTS_MODEL

logger = logging.getLogger(__name__)


def generate_speech(
    text: str,
    voice: str = "Kore",
) -> bytes:

    if not text or not text.strip():
        raise ValueError("Text cannot be empty.")

    if not GEMINI_API_KEY:
        raise RuntimeError(
            "Gemini TTS is not configured. Add GEMINI_API_KEY "
            "to ai-engine/.env to enable speech generation."
        )

    try:
        from google import genai

        tts_client = genai.Client(
            api_key=GEMINI_API_KEY,
            http_options={"api_version": "v1beta"},
        )

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
                                    "style": (
                                        "warm, friendly, clear "
                                        "and natural teacher voice"
                                    ),
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
