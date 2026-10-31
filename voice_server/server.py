from io import BytesIO
from pathlib import Path
from threading import Lock

import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from kokoro_onnx import Kokoro


# Paths to the downloaded local voice model files
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "kokoro-v1.0.onnx"
VOICES_PATH = BASE_DIR / "models" / "voices-v1.0.bin"

# Original built-in Kokoro voice
VOICE_NAME = "am_michael"

app = FastAPI(
    title="Campfire Local Narrator",
    description="Local text-to-speech for Campfire After Dark",
    version="1.0.0",
)

tts = None
inference_lock = Lock()


class NarrationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    speed: float = Field(default=0.88, ge=0.65, le=1.25)


@app.on_event("startup")
def load_model():
    global tts

    if not MODEL_PATH.is_file():
        raise RuntimeError(f"Model file not found: {MODEL_PATH}")

    if not VOICES_PATH.is_file():
        raise RuntimeError(f"Voice pack not found: {VOICES_PATH}")

    print("Loading the local Kokoro narrator...")
    tts = Kokoro(str(MODEL_PATH), str(VOICES_PATH))
    print(f"Campfire narrator is ready. Voice: {VOICE_NAME}")


@app.get("/health")
def health():
    return {
        "status": "ok" if tts is not None else "loading",
        "voice": VOICE_NAME,
        "engine": "Kokoro ONNX",
        "local_inference": True,
    }


@app.post("/synthesize")
def synthesize(request: NarrationRequest):
    if tts is None:
        raise HTTPException(
            status_code=503,
            detail="The narrator model is not ready yet.",
        )

    text = request.text.strip()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Narration text cannot be empty.",
        )

    try:
        with inference_lock:
            samples, sample_rate = tts.create(
                text,
                voice=VOICE_NAME,
                speed=request.speed,
                lang="en-us",
            )

        wav_buffer = BytesIO()

        sf.write(
            wav_buffer,
            samples,
            sample_rate,
            format="WAV",
            subtype="PCM_16",
        )

        return Response(
            content=wav_buffer.getvalue(),
            media_type="audio/wav",
            headers={
                "Cache-Control": "no-store",
                "X-Narrator-Voice": VOICE_NAME,
            },
        )

    except Exception as exc:
        print(f"Narration generation failed: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Local narration failed. Check the voice-server terminal.",
        ) from exc