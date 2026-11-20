
import logging
import re
import tempfile
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, HttpUrl
from starlette.concurrency import run_in_threadpool
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    IpBlocked,
    NoTranscriptFound,
    RequestBlocked,
    TranscriptsDisabled,
    VideoUnavailable,
    YouTubeRequestFailed,
)

from app.services.transcription import transcribe_hindi_to_english
from app.services.translation import translate_segments


router = APIRouter()
logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 25 * 1024 * 1024

ALLOWED_AUDIO_EXTENSIONS = {
    ".mp3",
    ".wav",
    ".m4a",
    ".ogg",
    ".webm",
    ".mp4",
}


# -----------------------------
# REQUEST MODELS
# -----------------------------
class YouTubeRequest(BaseModel):
    url: HttpUrl
    language_code: str | None = None



class TranslationRequest(BaseModel):
    source_language: str
    target_language: str
    segments: list[dict]


class YouTubeProcessRequest(BaseModel):
    url: HttpUrl
    target_language:str



# -----------------------------
# YOUTUBE VIDEO ID EXTRACTION
# -----------------------------

def extract_video_id(url: str) -> str:
    parsed_url = urlparse(str(url))

    hostname = parsed_url.hostname or ""

    video_id = None

    if hostname in ("youtu.be", "www.youtu.be"):
        video_id = parsed_url.path.lstrip("/")

    elif hostname.endswith("youtube.com"):
        if parsed_url.path == "/watch":
            video_id = parse_qs(parsed_url.query).get("v", [None])[0]

        elif parsed_url.path.startswith(
            ("/shorts/", "/embed/", "/live/")
        ):
            video_id = parsed_url.path.split("/")[2]

    if not video_id or not re.fullmatch(
        r"[A-Za-z0-9_-]{11}", video_id
    ):
        raise ValueError("Invalid YouTube video URL.")

    return video_id


# -----------------------------
# FETCH YOUTUBE TRANSCRIPT
# -----------------------------

def fetch_youtube_transcript(
    video_id: str,
    language_code: str | None = None,
) -> dict:

    api = YouTubeTranscriptApi()

    transcript_list = api.list(video_id)

    available_transcripts = list(transcript_list)

    if not available_transcripts:
        raise ValueError("No captions available for this video.")

    available_languages = [
        {
            "language": transcript.language,
            "language_code": transcript.language_code,
            "is_generated": transcript.is_generated,
            "is_translatable": transcript.is_translatable,
        }
        for transcript in available_transcripts
    ]

    if language_code:
        selected_transcript = transcript_list.find_transcript(
            [language_code]
        )
    else:
        selected_transcript = available_transcripts[0]

    fetched_transcript = selected_transcript.fetch()

    segments = []

    for item in fetched_transcript.snippets:
        text = item.text.strip()

        if text:
            segments.append({
                "start": round(item.start, 2),
                "end": round(item.start + item.duration, 2),
                "text": text,
            })

    return {
        "success": True,
        "video_id": video_id,
        "source_language": selected_transcript.language,
        "source_language_code": selected_transcript.language_code,
        "is_generated": selected_transcript.is_generated,
        "total_segments": len(segments),
        "segments": segments,
        "available_languages": available_languages,
    }


# -----------------------------
# AUDIO UPLOAD TRANSCRIPTION
# -----------------------------

@router.post("/transcription")
async def upload_audio(
    file: UploadFile = File(...)
):

    extension = Path(file.filename or "").suffix.lower()

    if extension not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio file format.",
        )

    content = await file.read(MAX_FILE_SIZE + 1)

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Audio file exceeds the 25 MB limit.",
        )

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension,
        ) as temp_file:

            temp_file.write(content)
            temp_path = temp_file.name

        result = await run_in_threadpool(
            transcribe_hindi_to_english,
            temp_path,
        )

        return {
            "success": True,
            "result": result,
        }

    except Exception:
        logger.exception("Audio transcription failed")

        raise HTTPException(
            status_code=500,
            detail="Audio transcription failed. Check AI Engine logs.",
        )

    finally:
        if temp_path and Path(temp_path).exists():
            Path(temp_path).unlink()


# -----------------------------
# YOUTUBE TRANSCRIPT API
# -----------------------------

@router.post("/youtube/transcript")
async def get_youtube_transcript(
    request: YouTubeRequest,
):

    try:
        video_id = extract_video_id(str(request.url))

        result = await run_in_threadpool(
            fetch_youtube_transcript,
            video_id,
            request.language_code,
        )

        return result

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except NoTranscriptFound:
        raise HTTPException(
            status_code=404,
            detail="Requested transcript language is unavailable.",
        )

    except TranscriptsDisabled:
        raise HTTPException(
            status_code=404,
            detail="Captions are disabled for this video.",
        )

    except VideoUnavailable:
        raise HTTPException(
            status_code=404,
            detail="YouTube video is unavailable.",
        )

    except (RequestBlocked, IpBlocked, YouTubeRequestFailed):
        logger.exception("YouTube request failed")

        raise HTTPException(
            status_code=503,
            detail="YouTube temporarily blocked the request.",
        )

    except Exception:
        logger.exception("YouTube transcript fetching failed")

        raise HTTPException(
            status_code=500,
            detail="Could not fetch YouTube transcript.",
        )


# -----------------------------
# GEMINI TRANSLATION API
# -----------------------------

@router.post("/translate")
async def translate_transcript(
    request: TranslationRequest,
):

    try:
        translated = await run_in_threadpool(
            translate_segments,
            request.segments,
            request.source_language,
            request.target_language,
        )

        return {
            "success": True,
            "source_language": request.source_language,
            "target_language": request.target_language,
            "total_segments": len(translated),
            "segments": translated,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception:
        logger.exception("AI translation endpoint failed")

        raise HTTPException(
            status_code=500,
            detail="AI translation failed. Check AI Engine logs.",
        )

@router.post("/youtube/process")
async def process_youtube_video(
    request: YouTubeProcessRequest,
):
    try:
        # Validate target language
        supported_languages = {
            "hi": "Hindi",
            "en": "English",
            "te": "Telugu",
        }

        target_language = request.target_language.lower()

        if target_language not in supported_languages:
            raise HTTPException(
                status_code=400,
                detail="Supported languages: hi, en, te",
            )

        # Extract YouTube video ID
        video_id = extract_video_id(str(request.url))

        # Fetch original transcript
        transcript_data = await run_in_threadpool(
            fetch_youtube_transcript,
            video_id,
            None,
        )

        source_language = transcript_data["source_language"]
        source_language_code = transcript_data["source_language_code"]
        original_segments = transcript_data["segments"]

        if not original_segments:
            raise HTTPException(
                status_code=404,
                detail="Transcript is empty for this video.",
            )

        # Reuse original transcript if language is already matching
        if source_language_code == target_language:
            translated_segments = original_segments

        else:
            # Translate using Gemini
            translated_segments = await run_in_threadpool(
                translate_segments,
                original_segments,
                source_language,
                target_language,
            )

        return {
            "success": True,
            "video_id": video_id,
            "source_language": source_language,
            "source_language_code": source_language_code,
            "target_language": supported_languages[target_language],
            "target_language_code": target_language,
            "total_segments": len(translated_segments),
            "segments": translated_segments,
        }

    except HTTPException:
        raise

    except NoTranscriptFound:
        raise HTTPException(
            status_code=404,
            detail="No transcript found for this video.",
        )

    except TranscriptsDisabled:
        raise HTTPException(
            status_code=404,
            detail="Captions are disabled for this video.",
        )

    except VideoUnavailable:
        raise HTTPException(
            status_code=404,
            detail="YouTube video is unavailable.",
        )

    except (RequestBlocked, IpBlocked, YouTubeRequestFailed):
        logger.exception("YouTube request failed")

        raise HTTPException(
            status_code=503,
            detail="YouTube temporarily blocked the request.",
        )

    except Exception:
        logger.exception("YouTube processing failed")

        raise HTTPException(
            status_code=500,
            detail="YouTube processing failed. Check AI Engine logs.",
        )
