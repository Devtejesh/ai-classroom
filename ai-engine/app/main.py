
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.speech import router as speech_router
from app.routes.translation import router as transcription_router
from app.routes.tutor import router as tutor_router

app = FastAPI(
    title="AI Classroom Engine",
    description="AI-powered video learning and audio processing engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
       "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "AI Classroom Engine"
    }


app.include_router(
    transcription_router,
    prefix="/api",
    tags=["Transcription"]
)

app.include_router(
    tutor_router,
    prefix="/api",
    tags=["AI Tutor"]
)

app.include_router(
    speech_router,
    prefix="/api",
    tags=["AI Tutor Voice"]
)
