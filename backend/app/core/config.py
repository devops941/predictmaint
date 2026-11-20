import re
import sys
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BACKEND_DIR / ".env"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[str(ENV_PATH), ".env", "backend/.env"],
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_ENV: str = "development"
    MONGODB_URI: str = Field(..., description="MongoDB Atlas connection URI")
    MONGODB_DB_NAME: str = "predictmaint"
    MONGODB_TEST_DB_NAME: str = "predictmaint_test"

    JWT_SECRET: str = Field(..., min_length=16, description="Secret for signing JWT tokens")
    JWT_ACCESS_MINUTES: int = 60
    JWT_REFRESH_DAYS: int = 7
    JWT_ALGORITHM: str = "HS256"

    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://127.0.0.1:5173"
    UPLOAD_MAX_MB: int = 25
    DEFAULT_HORIZON_HOURS: int = 72
    DEFAULT_COST_MISS: float = 50000.0
    DEFAULT_COST_FALSE: float = 2000.0
    DEMO_USER_PASSWORD: str = "PredictMaint2026!"
    LOG_LEVEL: str = "INFO"

    @field_validator("MONGODB_URI")
    @classmethod
    def validate_mongodb_uri(cls, v: str) -> str:
        if not v or "<paste-" in v or v.startswith("<") or "placeholder" in v.lower():
            raise ValueError(
                "CRITICAL CONFIG ERROR: MONGODB_URI is missing or contains placeholder. "
                "Please configure a valid MongoDB URI in backend/.env"
            )
        if not (v.startswith("mongodb://") or v.startswith("mongodb+srv://")):
            raise ValueError("CRITICAL CONFIG ERROR: MONGODB_URI must start with mongodb:// or mongodb+srv://")
        return v

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if not v or "<generate-" in v or v.startswith("<") or "placeholder" in v.lower() or len(v.strip()) < 16:
            raise ValueError(
                "CRITICAL CONFIG ERROR: JWT_SECRET is missing, placeholder, or too short (<16 chars). "
                "Please set a strong JWT_SECRET in backend/.env"
            )
        return v

    @property
    def cors_origin_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def sanitized_uri(self) -> str:
        """Return MongoDB URI with password redacted for safe logging."""
        return re.sub(r":([^@]+)@", ":***@", self.MONGODB_URI)


try:
    settings = Settings()
except Exception as e:
    sys.stderr.write(f"\n[CONFIG FATAL ERROR] Failed to load application settings:\n{e}\n\n")
    # Do not exit if running in test environment where mock may be used, but raise
    raise
