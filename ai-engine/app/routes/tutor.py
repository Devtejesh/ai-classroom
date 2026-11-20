
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.services.tutor import generate_tutor_answer

logger = logging.getLogger(__name__)

router = APIRouter()


class TutorRequest(BaseModel):
    segments: list[dict] = Field(min_length=1)
    question: str = Field(min_length=1)
    target_language: str
    current_timestamp: float | None = None


@router.post("/tutor/ask")
async def ask_tutor(request: TutorRequest):

    try:
        answer = await run_in_threadpool(
            generate_tutor_answer,
            request.segments,
            request.question,
            request.target_language,
            request.current_timestamp,
        )

        return {
            "success": True,
            "question": request.question,
            "target_language": request.target_language,
            "answer": answer,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception:
        logger.exception("AI Tutor request failed.")

        raise HTTPException(
            status_code=502,
            detail="AI Tutor is temporarily unavailable. Please try again.",
        )
