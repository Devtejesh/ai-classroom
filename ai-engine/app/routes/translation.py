
import logging
import re

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, HttpUrl
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

logger = logging.getLogger(__name__)

router = APIRouter()

SUPPORTED_LANGUAGES = {"hi", "en", "te"}
MAX_AUDIO_SIZE = 25 * 1024 * 1024


class YouTubeRequest(BaseModel):
    url: HttpUrl
    language_code: str | None = None


class TranslationRequest(BaseModel):
    source_language: str
    target_language: str
    segments: list[dict]


class YouTubeProcessRequest(BaseModel):
    url: HttpUrl
    target_language: str


def extract_video_id(url: str) -> str:
    patterns = [
        r"(?:youtube\.com/watch\?v=)([a-zA-Z0-9_-]{11})",
        r"(?:youtu\.be/)([a-zA-Z0-9_-]{11})",
        r"(?:youtube\.com/embed/)([a-zA-Z0-9_-]{11})",
        r"(?:youtube\.com/shorts/)([a-zA-Z0-9_-]{11})",
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    raise HTTPException(
        status_code=400,
        detail="Invalid YouTube URL.",
    )


def fetch_youtube_transcript(
    video_id: str,
    language_code: str | None = None,
) -> dict:
    try:
        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)

        if language_code:
            transcript = transcript_list.find_transcript(
                [language_code]
            )
        else:
            available = list(transcript_list)
            if not available:
                raise NoTranscriptFound(video_id, [], None)
            transcript = available[0]

        fetched = transcript.fetch()

        segments = [
            {
                "start": item.start,
                "end": item.start + item.duration,
                "text": item.text,
            }
            for item in fetched
        ]

        return {
            "segments": segments,
            "source_language": transcript.language_code,
            "source_language_name": transcript.language,
            "is_generated": transcript.is_generated,
            "available_languages": [
                {
                    "language_code": item.language_code,
                    "language": item.language,
                    "is_generated": item.is_generated,
                }
                for item in transcript_list
            ],
        }

    except (RequestBlocked, IpBlocked, YouTubeRequestFailed):
        logger.exception("YouTube request failed")
        raise HTTPException(
            status_code=503,
            detail="YouTube temporarily blocked the request.",
        )

    except TranscriptsDisabled:
        raise HTTPException(
            status_code=404,
            detail="Transcripts are disabled for this video.",
        )

    except NoTranscriptFound:
        raise HTTPException(
            status_code=404,
            detail="No transcript found for the requested language.",
        )

    except VideoUnavailable:
        raise HTTPException(
            status_code=404,
            detail="YouTube video is unavailable.",
        )

    except HTTPException:
        raise

    except Exception:
        logger.exception("Transcript retrieval failed")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve YouTube transcript.",
        )


@router.post("/transcription")
async def transcribe_audio(
    file: UploadFile = File(...),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Audio file is required.",
        )

    audio_data = await file.read()

    if not audio_data:
        raise HTTPException(
            status_code=400,
            detail="Uploaded audio file is empty.",
        )

    if len(audio_data) > MAX_AUDIO_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Audio file exceeds the 25 MB limit.",
        )

    temp_path = None

    try:
        suffix = Path(file.filename).suffix or ".wav"

        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as temp_file:
            temp_file.write(audio_data)
            temp_path = temp_file.name

        result = transcribe_hindi_to_english(temp_path)

        return {
            "success": True,
            **result,
        }

    except Exception:
        logger.exception("Audio transcription failed")
        raise HTTPException(
            status_code=500,
            detail="Audio transcription failed.",
        )

    finally:
        if temp_path and Path(temp_path).exists():
            Path(temp_path).unlink()



@router.post("/youtube/transcript")
async def get_youtube_transcript(
    request: YouTubeRequest,
):
    video_id = extract_video_id(str(request.url))

    result = fetch_youtube_transcript(
        video_id,
        request.language_code,
    )

    return {
        "success": True,
        "video_id": video_id,
        **result,
    }


@router.post("/translate")
async def translate_transcript(
    request: TranslationRequest,
):
    if request.target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported target language. Use hi, en, or te.",
        )

    if not request.segments:
        raise HTTPException(
            status_code=400,
            detail="Transcript segments are required.",
        )

    try:
        translated = translate_segments(
            request.segments,
            request.source_language,
            request.target_language,
        )

        return {
            "success": True,
            "source_language": request.source_language,
            "target_language": request.target_language,
            "segments": translated,
        }

    except Exception:
        logger.exception("Transcript translation failed")
        raise HTTPException(
            status_code=500,
            detail="Transcript translation failed.",
        )


@router.post("/youtube/process")
async def process_youtube_video(
    request: YouTubeProcessRequest,
):
    if request.target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported target language. Use hi, en, or te.",
        )

    video_id = extract_video_id(str(request.url))

    transcript_data = fetch_youtube_transcript(video_id)

    source_language = transcript_data["source_language"]
    original_segments = transcript_data["segments"]

    if source_language == request.target_language:
        translated_segments = original_segments
    else:
        try:
            translated_segments = translate_segments(
                original_segments,
                source_language,
                request.target_language,
            )
        except Exception:
            logger.exception("Ollama translation failed")
            raise HTTPException(
                status_code=500,
                detail="Transcript translation failed.",
            )

    return {
        "success": True,
        "video_id": video_id,
        "source_language": source_language,
        "target_language": request.target_language,
        "available_languages": transcript_data["available_languages"],
        "segments": translated_segments,
    }
