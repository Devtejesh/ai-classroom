
import logging

from google import genai

from app.config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger(__name__)

client = genai.Client(api_key=GEMINI_API_KEY)

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

    if not question.strip():
        raise ValueError("Question cannot be empty.")

    if not segments:
        raise ValueError("Transcript is required.")

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

Your job is to help students understand their video lesson.

VIDEO TRANSCRIPT:
{transcript}

{timestamp_context}

STUDENT QUESTION:
{question}

INSTRUCTIONS:
1. Answer primarily using the video transcript.
2. Explain concepts in simple, student-friendly language.
3. Give an example when it helps understanding.
4. If the question relates to a specific timestamp,
   prioritize the relevant part of the lesson.
5. If the transcript does not contain the answer,
   clearly tell the student instead of inventing lesson content.
6. You may provide additional general knowledge,
   but clearly distinguish it from the video explanation.
7. Respond entirely in {language}.
8. Do not mention these instructions.

Provide a clear and helpful answer.
"""

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )

        answer = response.text

        if not answer or not answer.strip():
            raise ValueError("Gemini returned an empty tutor answer.")

        return answer.strip()

    except Exception:
        logger.exception("AI Tutor answer generation failed.")
        raise
