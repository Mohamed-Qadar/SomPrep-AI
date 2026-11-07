import logging
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("somprep.config")

_DEFAULT_SECRET_KEY = "super-secret-key-change-in-production"


BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    # Deployment / environment
    ENVIRONMENT: str = "development"  # 'development' | 'production'

    # Database Configuration
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/somprep_db"

    # Security Configuration
    SECRET_KEY: str = "super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 Days

    # CORS / frontend (comma-separated list of allowed origins)
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    FRONTEND_URL: str = "http://localhost:3000"

    # Receipt upload storage (kept OUTSIDE any static/public directory).
    # Empty -> defaults to <backend>/uploads/receipts (computed below).
    RECEIPT_STORAGE_PATH: str = ""
    MAX_RECEIPT_SIZE_MB: float = 5.0

    # Community screenshot/image storage (kept outside frontend/public assets).
    # Empty -> defaults to <backend>/uploads/community (computed below).
    COMMUNITY_MEDIA_STORAGE_PATH: str = ""
    MAX_COMMUNITY_MEDIA_SIZE_MB: float = 5.0

    # Teacher exam materials storage (PDF, Word, PowerPoint, and study files).
    TEACHER_MATERIAL_STORAGE_PATH: str = ""
    MAX_TEACHER_MATERIAL_SIZE_MB: float = 20.0

    # Payment & EVC Plus Integration Configuration (Hormuud / WaafiPay)
    EVC_BASE_URL: str = "https://api.waafipay.net/asm"
    EVC_MERCHANT_UID: str = ""
    EVC_API_USER_ID: str = ""
    EVC_API_KEY: str = ""
    EVC_SANDBOX_MODE: bool = True  # set to false in production .env
    EVC_TIMEOUT_SECONDS: float = 60.0  # USSD push waits for customer PIN entry
    EVC_PLUS_API_KEY: str = ""  # legacy name, used as fallback for EVC_API_KEY
    SUBSCRIPTION_PRICE_USD: float = 0.5

    # Payment provider webhook (FUTURE). Until a real shared secret is configured
    # here, webhook signatures CANNOT be verified, so the webhook never activates
    # a subscription and API-mode payments stay disabled. HMAC-SHA256 is assumed.
    EVC_WEBHOOK_SECRET: str = ""
    EVC_MERCHANT_RECEIVER: str = ""  # expected receiver/merchant account on callbacks

    # OpenAI Configuration (Coach Refik, streak comments, diagnostic reports)
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_TIMEOUT_SECONDS: float = 30.0

    # Settings configuration to read from .env file
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # ── Derived helpers ──────────────────────────────────────────────────────
    @property
    def is_production(self) -> bool:
        """Treat ENVIRONMENT=production OR EVC live mode as production."""
        return self.ENVIRONMENT.strip().lower() == "production" or not self.EVC_SANDBOX_MODE

    @property
    def cors_origins(self) -> list:
        return [o.strip() for o in self.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def receipt_storage_dir(self) -> Path:
        if self.RECEIPT_STORAGE_PATH:
            return Path(self.RECEIPT_STORAGE_PATH)
        # Default: <backend>/uploads/receipts — NOT under any static mount.
        return BACKEND_DIR / "uploads" / "receipts"

    @property
    def community_media_storage_dir(self) -> Path:
        if self.COMMUNITY_MEDIA_STORAGE_PATH:
            return Path(self.COMMUNITY_MEDIA_STORAGE_PATH)
        # Default: <backend>/uploads/community, served only via API routes.
        return BACKEND_DIR / "uploads" / "community"

    @property
    def teacher_material_storage_dir(self) -> Path:
        if self.TEACHER_MATERIAL_STORAGE_PATH:
            return Path(self.TEACHER_MATERIAL_STORAGE_PATH)
        return BACKEND_DIR / "uploads" / "teacher_materials"


settings = Settings()

_DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/somprep_db"


def _validate_production_config(s: "Settings") -> None:
    """
    Fail fast on unsafe defaults in production; warn in development.
    Production is inferred from ENVIRONMENT=production or EVC_SANDBOX_MODE=false.
    """
    unsafe = []
    if s.SECRET_KEY == _DEFAULT_SECRET_KEY:
        unsafe.append("SECRET_KEY is the bundled default (JWTs could be forged)")
    if s.DATABASE_URL == _DEFAULT_DATABASE_URL:
        unsafe.append("DATABASE_URL uses default postgres:postgres credentials")
    only_localhost = all(
        ("localhost" in o or "127.0.0.1" in o) for o in s.cors_origins
    ) if s.cors_origins else True

    if s.is_production:
        if unsafe:
            raise RuntimeError(
                "Refusing to start in production with unsafe defaults: "
                + "; ".join(unsafe)
                + ". Set these in backend/.env."
            )
        if only_localhost:
            logger.warning(
                "CORS_ALLOWED_ORIGINS only contains localhost while running in "
                "production. Set your real frontend origin(s) in backend/.env."
            )
    else:
        for item in unsafe:
            logger.warning("Insecure default in use (dev): %s", item)


_validate_production_config(settings)
