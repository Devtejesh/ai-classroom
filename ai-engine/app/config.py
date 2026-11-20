
import os
from pathlib import Path

from dotenv import load_dotenv

# AI Engine project root
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from ai-engine/.env
load_dotenv(BASE_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is missing in .env file")
