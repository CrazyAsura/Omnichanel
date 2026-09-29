"""Local Brazilian Portuguese speech. Audio and text are never persisted."""
import collections
import hashlib
import io
import re
import threading
import wave

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

router = APIRouter()
_lock = threading.Lock()
_pipeline = None
_pipeline_lock = threading.Lock()

# Estrutura de dados: Padrões de regex imutáveis e pré-compilados para eliminar
# o overhead O(K * M) de re-compilação e análise sintática a cada requisição
_REGEX_CODE_BLOCKS = re.compile(r"```[\s\S]*?```")
_REGEX_MARKDOWN_LINKS = re.compile(r"!?\[([^\]]*)\]\([^)]*\)")
_REGEX_URLS = re.compile(r"https?://\S+")
_REGEX_SPECIAL_CHARS = re.compile(r"[#*_`>|]")
_REGEX_WHITESPACE = re.compile(r"\s+")


class SpeechAudioLruCache:
    """
    Estrutura de dados LRU Cache (Hash Table + Doubly Linked List via OrderedDict)
    com controle de concorrência thread-safe para armazenamento em memória
    de áudios WAV já sintetizados.

    Garantias assintóticas:
      - get(key): O(1)
      - put(key, value): O(1)
      - evicção do menos recentemente usado: O(1)
    """

    def __init__(self, capacity: int = 256):
        self.capacity = capacity
        self._cache: collections.OrderedDict[str, bytes] = collections.OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> bytes | None:
        with self._lock:
            if key not in self._cache:
                return None
            self._cache.move_to_end(key)
            return self._cache[key]

    def put(self, key: str, value: bytes) -> None:
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                self._cache[key] = value
                return
            if len(self._cache) >= self.capacity:
                self._cache.popitem(last=False)  # Remove o menos recentemente usado em O(1)
            self._cache[key] = value

    def __len__(self) -> int:
        with self._lock:
            return len(self._cache)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()


# Instância global da estrutura de dados LRU Cache
_audio_lru_cache = SpeechAudioLruCache(capacity=256)


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


def spoken_text(text: str) -> str:
    text = _REGEX_CODE_BLOCKS.sub(" Trecho de código omitido. ", text)
    text = _REGEX_MARKDOWN_LINKS.sub(r"\1", text)
    text = _REGEX_URLS.sub("", text)
    text = _REGEX_SPECIAL_CHARS.sub(" ", text)
    return _REGEX_WHITESPACE.sub(" ", text).strip()


def synthesize(text: str) -> bytes:
    global _pipeline
    import numpy as np
    with _pipeline_lock:
        if _pipeline is None:
            from kokoro import KPipeline
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


def warmup() -> None:
    global _pipeline
    with _pipeline_lock:
        if _pipeline is None:
            try:
                from kokoro import KPipeline
                _pipeline = KPipeline(lang_code="p", device="cpu", repo_id="hexgrad/Kokoro-82M")
                import logging
                logging.getLogger("omnichannel-ai.speech").info("Kokoro TTS aquecido e pronto para uso.")
            except Exception as e:
                import logging
                logging.getLogger("omnichannel-ai.speech").warning("Falha ao pré-carregar Kokoro TTS: %s", e)


@router.post("/api/speech", tags=["Speech"])
def speech(request: SpeechRequest):
    text = spoken_text(request.text) or request.text.strip()
    if not text:
        raise HTTPException(422, "Texto sem conteúdo para leitura")

    # Hash SHA-256 de tamanho fixo para busca uniforme O(1) na tabela hash do cache
    cache_key = hashlib.sha256(text.encode("utf-8")).hexdigest()

    # 1. Consulta em tempo O(1) no LRU Cache:
    # Se presente, responde instantaneamente (<1ms) SEM adquirir o lock do modelo TTS,
    # eliminando gargalo de CPU/GPU e respostas 429 para requisições frequentes/repetidas.
    cached_audio = _audio_lru_cache.get(cache_key)
    if cached_audio is not None:
        return Response(
            cached_audio,
            media_type="audio/wav",
            headers={"Cache-Control": "public, max-age=86400", "X-Cache": "HIT"},
        )

    # 2. Se Cache Miss, adquire lock de execução do modelo para sintetizar
    if not _lock.acquire(blocking=False):
        raise HTTPException(429, "Voz ocupada. Tente novamente.", headers={"Retry-After": "5"})
    try:
        audio_data = synthesize(text)
        _audio_lru_cache.put(cache_key, audio_data)
        return Response(
            audio_data,
            media_type="audio/wav",
            headers={"Cache-Control": "public, max-age=86400", "X-Cache": "MISS"},
        )
    except Exception as exc:
        # Never expose model exceptions: they can contain the input text.
        import logging
        logging.getLogger("omnichannel-ai.speech").exception("Falha interna na síntese de voz (%s)", type(exc).__name__)
        raise HTTPException(503, "Síntese de voz indisponível") from None
    finally:
        _lock.release()
