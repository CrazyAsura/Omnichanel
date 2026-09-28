FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app
RUN sed -i 's|http://|https://|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || sed -i 's|http://|https://|g' /etc/apt/sources.list \
    && apt-get update && apt-get install -y --no-install-recommends espeak-ng libsndfile1 && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && useradd --create-home --uid 10001 appuser

COPY --chown=appuser:appuser app ./app
COPY --chown=appuser:appuser proto ./proto
COPY --chown=appuser:appuser skills ./skills
COPY --chown=appuser:appuser data ./data
RUN mkdir -p /app/data/chroma && chown -R appuser:appuser /app/data
USER appuser

EXPOSE 8000 50051
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
