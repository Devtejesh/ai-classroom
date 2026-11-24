
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", encoding="utf-8-sig")

# Primary LLM provider
AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini").strip().lower()

# Gemini configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or None
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Groq configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY") or None
GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "openai/gpt-oss-120b"
)

# Gemini Text-to-Speech configuration
TTS_MODEL = os.getenv(
    "TTS_MODEL",
    "gemini-3.8-flash-lite-tts"
)

SUPPORTED_PROVIDERS = ("gemini", "groq")

if AI_PROVIDER not in SUPPORTED_PROVIDERS:
    raise ValueError(
        f"Unsupported AI provider: {AI_PROVIDER}. "
        f"Supported providers: {SUPPORTED_PROVIDERS}"
    )
