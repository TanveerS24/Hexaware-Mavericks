from functools import lru_cache
from typing import List, Union, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Centralized application configuration loaded from environment variables and .env file.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # App Info
    APP_NAME: str = "Citizen Call Intelligence Platform"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 5432
    DATABASE_USER: str = "postgres"
    DATABASE_PASSWORD: str = "postgres"
    DATABASE_NAME: str = "grievance_db"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/grievance_db"

    # Security & Tokens
    JWT_SECRET_KEY: str = "default_secret_key_change_in_production_38d92a10b4"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Supabase Configuration
    SUPABASE_URL: str = "https://your-project-id.supabase.co"
    SUPABASE_PUBLISHABLE_KEY: str = ""
    SUPABASE_SECRET_KEY: str = ""
    SUPABASE_JWKS_URL: str = ""

    # Cloud AI Configuration (Anthropic Claude / Google Gemini / OpenAI-compatible API)
    AI_PROVIDER: str = "claude"
    AI_API_KEY: str = ""
    AI_MODEL: str = "claude-3-5-haiku-20241022"
    AI_EMBEDDING_MODEL: str = "text-embedding-004"
    AI_BASE_URL: Optional[str] = None
    ENABLE_MOCK_AI_FALLBACK: bool = True
    EMBEDDING_DIMENSION: int = 768

    # Portal Ports
    CITIZEN_API_PORT: int = 8001
    OFFICER_API_PORT: int = 8003
    ADMIN_API_PORT: int = 8004

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = "*"

    # Geocoding & External Services
    GEOCODING_API_KEY: str = "dummy_geocoding_key"

    # Credibility & Block Constants
    INITIAL_CREDIBILITY_SCORE: float = 1.0
    MALICIOUS_PENALTY: float = 0.15
    LOW_CREDIBILITY_THRESHOLD: float = 0.5
    RECOVERY_TARGET_SCORE: float = 0.7
    RECOVERY_PERIOD_MULTIPLIER: float = 2.0  # 2 * block_duration_days
    DUPLICATE_SIMILARITY_THRESHOLD: float = 0.82

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_database_url(cls, v: str) -> str:
        if not v:
            return v
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v == "*":
                return ["*"]
            return [i.strip() for i in v.split(",") if i.strip()]
        return v


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    """
    return Settings()


settings = get_settings()
