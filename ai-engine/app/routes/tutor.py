
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.llm import generate_response


logger = logging.getLogger(__name__)

router = APIRouter()

SUPPORTED_LANGUAGES = {
    "hi": "Hindi",
    "en": "English",
    "te": "Telugu",
}


class TutorRequest(BaseModel):
    segments: list[dict] = Field(default_factory=list)
    question: str
    target_language: str
    current_timestamp: float | None = None


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

    # Build video transcript safely.
    transcript_parts = []

    for segment in segments:
        text = segment.get("text", "")

        if not text:
            continue

        start = segment.get("start", 0)
        end = segment.get("end", 0)

        transcript_parts.append(
            f"[{start}s - {end}s] {text}"
        )

    transcript = "\n".join(transcript_parts)

    timestamp_context = ""

    if current_timestamp is not None:
        timestamp_context = (
            f"\nThe student is currently watching the video "
            f"at {current_timestamp} seconds."
        )

    prompt = f"""
You are an intelligent, patient and highly capable personal AI Tutor.

Your goal is to help students deeply understand concepts, not merely
repeat or summarize the video transcript.

VIDEO TRANSCRIPT:
{transcript if transcript.strip() else "No transcript is available."}

{timestamp_context}

STUDENT QUESTION:
{question}

TEACHING RULES:

1. Understand what the student is actually asking before answering.

2. Use the video transcript as context when the question is about the video.

3. You are NOT restricted to the video transcript.
   Use your general knowledge, reasoning and understanding to answer
   questions related to the video's subject.

4. If the student asks a related question that is not directly explained
   in the video, answer it using your own knowledge.

5. Clearly distinguish between video explanations and additional knowledge.

6. If the student asks about an unrelated topic, answer normally.

7. If the student does not understand:
   - Explain using simpler words.
   - Break the concept into small steps.
   - Give practical examples.
   - Use a different explanation instead of repeating yourself.

8. For programming questions, provide understandable examples
   and explain how they work.

9. For timestamp questions, prioritize the transcript around that timestamp.
   Never pretend to know unavailable video content.

10. Never invent facts, video content or quotations.
    If something is uncertain, say so honestly.

11. Respond entirely in {language}.
    Use simple, natural language suitable for a beginner.

12. RESPONSE FORMATTING RULES — VERY IMPORTANT:

   A. Use clean Markdown formatting.

   B. Use headings for different sections:
      ## Step 1: Concept
      ## Step 2: Explanation

   C. Use numbered lists for sequential explanations.

   D. Use bullet points for important observations.

   E. Use **bold text** for important terms.

   F. MATHEMATICAL FORMATTING:
      - Use valid LaTeX for all mathematical expressions.
      - Use single dollar signs for inline equations.
      - Use double dollar signs for standalone equations.
      - Never put mathematical expressions inside backticks.
      - Never remove mathematical operators.
      - Never combine separate variables into one variable.
      - Use proper subscripts and fractions.

      Correct examples:
      Inline: $S_1:S_2 = 7:5$

      Display:
      $$T_1:T_2 = 5:7$$

      Fraction:
      $$\\frac{5}{7}$$

      Incorrect examples:
      S1S2=S157S1=75
      `S1S2=S157`

   G. TABLE FORMATTING:
      - Use proper Markdown table syntax.
      - Use actual vertical pipe characters | as column separators.
      - Never write escaped pipe characters \\|.
      - Never put an entire table inside a code block.

      Example:

      | Quantity | Original | New |
      |---|---:|---:|
      | Speed | 7 | 5 |
      | Time | 5 | 7 |

   H. Do not use HTML entities such as &#xA; for headings.
      Use normal Markdown headings.

   I. Do not output raw formatting instructions or malformed LaTeX.

   J. Do not wrap ordinary mathematical explanations in code blocks.

13. Keep explanations clear, structured and easy to follow.
    Avoid unnecessarily long paragraphs.

14. Behave like a patient teacher who wants the student to understand,
    not like a chatbot that only summarizes information.


IMPORTANT TABLE RULES:

- Every table row MUST start on a new line.
- The header row and separator row MUST be on separate lines.
- Never combine multiple table rows into one line.
- Never put mathematical variables inside backticks.
- Use proper LaTeX for variables and fractions.
- Do not use HTML entities for line breaks.

Correct format:

| Parameter | Original Value | New Value | Ratio |
|---|---|---|---|
| Speed | $S_1$ | $\\frac{5}{7}S_1$ | $7:5$ |
| Time | $T_1$ | $\\frac{7}{5}T_1$ | $5:7$ |


Before returning your answer, silently verify:
- Mathematical expressions are valid.
- Fractions and operators are preserved.
- Markdown tables use correct separators.
- No equations are accidentally wrapped in backticks.
- The answer is entirely in the requested language.

Provide the most useful answer to the student's actual question.
"""

    try:
        answer = generate_response(prompt)

        if not answer or not answer.strip():
            raise RuntimeError(
                "Gemini returned an empty tutor answer."
            )

        return answer.strip()

    except Exception:
        logger.exception("Gemini AI Tutor generation failed.")
        raise


@router.post("/tutor")
async def ask_tutor(request: TutorRequest):

    try:
        answer = generate_tutor_answer(
            segments=request.segments,
            question=request.question,
            target_language=request.target_language,
            current_timestamp=request.current_timestamp,
        )

        return {
            "success": True,
            "answer": answer,
            "language": request.target_language,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception:
        logger.exception("AI Tutor request failed")

        raise HTTPException(
            status_code=500,
            detail="AI Tutor could not generate an answer.",
        )
