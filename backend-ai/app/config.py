import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Omnichannel AI Backend (AgentScope)"
    VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    HTTP_PORT: int = int(os.getenv("HTTP_PORT", "8000"))
    GRPC_PORT: int = int(os.getenv("GRPC_PORT", "50051"))
    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    ELASTICSEARCH_URL: str = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
    AI_EVENTS_TOPIC: str = os.getenv("AI_EVENTS_TOPIC", "ai.events")
    SERVICE_AUTH_TOKEN: str = os.getenv("AI_SERVICE_TOKEN", "")
    CORS_ALLOWED_ORIGINS: str = os.getenv("CORS_ALLOWED_ORIGINS", "")
    
    # Ollama settings (utiliza o servidor Ollama no disco Z)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "gemma4:e4b")
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    SKILLS_DIR: Path = BASE_DIR / "skills"
    DOCS_DIR: Path = BASE_DIR / "data" / "docs"
    DOCUMENT_ACCESS_POLICY: Path = BASE_DIR / "data" / "document-access.json"

settings = Settings()
