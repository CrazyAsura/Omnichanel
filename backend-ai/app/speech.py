"""Local Brazilian Portuguese speech. Audio and text are never persisted."""
import io
import re
import threading
import wave

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

router = APIRouter()
_lock = threading.Lock()
_pipeline = None


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


def spoken_text(text: str) -> str:
    text = re.sub(r"```[\s\S]*?```", " Trecho de código omitido. ", text)
    text = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"https?://\S+", "", text)
    return re.sub(r"\s+", " ", re.sub(r"[#*_`>|]", " ", text)).strip()


def synthesize(text: str) -> bytes:
    global _pipeline
    import numpy as np
    from kokoro import KPipeline

    if _pipeline is None:
        _pipeline = KPipeline(lang_code="p", device="cpu", repo_id="hexgrad/Kokoro-82M")
    output = io.BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(24000)
        samples = 0
        for _, _, audio in _pipeline(text, voice="pf_dora", speed=1.0):
            data = audio.detach().cpu().numpy()
            samples += len(data)
            if samples > 24000 * 360:
                raise ValueError("Audio duration limit")
            wav.writeframes((np.clip(data, -1, 1) * 32767).astype("<i2").tobytes())
    if not samples:
        raise ValueError("Empty audio")
    return output.getvalue()


@router.post("/api/speech", tags=["Speech"])
def speech(request: SpeechRequest):
    text = spoken_text(request.text)
    if not text:
        raise HTTPException(422, "Texto sem conteúdo para leitura")
    if not _lock.acquire(blocking=False):
        raise HTTPException(429, "Voz ocupada. Tente novamente.", headers={"Retry-After": "5"})
    try:
        return Response(synthesize(text), media_type="audio/wav", headers={"Cache-Control": "no-store"})
    except Exception:
        # Never expose model exceptions: they can contain the input text.
        raise HTTPException(503, "Síntese de voz indisponível") from None
    finally:
        _lock.release()
