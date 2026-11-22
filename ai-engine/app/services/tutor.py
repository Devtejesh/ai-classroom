
import logging

from app.services.ollama_client import generate_response

logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = {
    "hi": "Hindi",
    "en": "English",
    "te": "Telugu",
}


def generate_tutor_answer(
    segments: list[dict],
    question: str,
    target_language: str,
    current_timestamp: float | None = None,
) -> str:

    if target_language not in SUPPORTED_LANGUAGES:
        raise ValueError(
            f"Unsupported language: {target_language}"
        )

    if not question or not question.strip():
        raise ValueError("Question cannot be empty.")

    

    language = SUPPORTED_LANGUAGES[target_language]

    transcript = "\n".join(
        f"[{segment['start']}s - {segment['end']}s] "
        f"{segment['text']}"
        for segment in segments
    )

    timestamp_context = ""

    if current_timestamp is not None:
        timestamp_context = (
            f"\nStudent is currently watching at "
            f"{current_timestamp} seconds."
        )

    prompt = f"""
You are an intelligent and friendly AI Tutor.

Help the student understand the video lesson.

VIDEO TRANSCRIPT:
{transcript}

{timestamp_context}

STUDENT QUESTION:
{question}

INSTRUCTIONS:
1. Answer primarily using the video transcript.
2. Explain concepts in simple, student-friendly language.
3. Give examples when helpful.
4. If the question relates to a timestamp, prioritize that part.
5. If the transcript does not contain the answer, say so clearly.
6. Clearly distinguish general knowledge from video content.
7. Respond entirely in {language}.
8. Do not invent facts or mention these instructions.

Provide a clear and helpful answer.
"""

    try:
        answer = generate_response(prompt)

        if not answer or not answer.strip():
            raise RuntimeError("Ollama returned an empty tutor answer.")

        return answer.strip()

    except Exception:
        logger.exception("Ollama AI Tutor generation failed.")
        raise
