"""
Protocol SIFT — Application Settings
Centralised configuration with environment variable support.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Protocol SIFT"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-this-in-production"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017/protocol_sift"
    MONGODB_DB: str = "protocol_sift"

    # Google Gemini
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-pro"

    # Storage
    EVIDENCE_STORAGE_PATH: str = "./evidence_store"
    MAX_UPLOAD_SIZE_MB: int = 2048

    # Confidence Thresholds
    CONFIDENCE_REINVESTIGATE_THRESHOLD: float = 0.60
    CONFIDENCE_CONFIRMED_THRESHOLD: float = 0.85

    # MITRE
    MITRE_CACHE_TTL_SECONDS: int = 86400

    # JWT Auth
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
