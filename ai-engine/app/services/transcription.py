from pathlib import Path
from faster_whisper import WhisperModel

_model = None


def get_model():
    global _model

    if _model is None:
        _model = WhisperModel(
            "tiny",
            device="cpu",
            compute_type="int8",
            cpu_threads=4,
            num_workers=1,
        )

    return _model


def transcribe_hindi_to_english(audio_path: str) -> dict:
    path = Path(audio_path)

    if not path.is_file():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    model = get_model()

    segments, info = model.transcribe(
        str(path),
        language="hi",
        task="translate",
        beam_size=1,
        vad_filter=True,
        condition_on_previous_text=False,
    )

    translated_segments = []

    for segment in segments:
        text = segment.text.strip()

        if text:
            translated_segments.append({
                "start": round(segment.start, 2),
                "end": round(segment.end, 2),
                "text": text,
            })

    return {
        "source_language": info.language,
        "target_language": "en",
        "segments": translated_segments,
    }