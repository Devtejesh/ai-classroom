
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool
from io import BytesIO

from app.services.speech import generate_speech

logger = logging.getLogger(__name__)

router = APIRouter()


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    voice: str = "Kore"


@router.post("/tutor/speak")
async def tutor_speak(request: SpeechRequest):

    try:
        audio_bytes = await run_in_threadpool(
            generate_speech,
            request.text,
            request.voice,
        )

        return StreamingResponse(
            BytesIO(audio_bytes),
            media_type="audio/wav",
            headers={
                "Content-Disposition": 'inline; filename="tutor.wav"'
            },
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception:
        logger.exception("Tutor speech API failed.")

        raise HTTPException(
            status_code=502,
            detail="Speech generation failed. Please try again.",
        )
