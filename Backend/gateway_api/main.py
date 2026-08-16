from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
from sqlalchemy import text

from core.config import settings
from core.exceptions import register_exception_handlers
from core.middleware import AuthenticationMiddleware
from core.db.session import engine
from core.db.base import Base
import core.models

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Safely creates database tables and enables pgvector extension on startup.
    """
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.warning(f"Database schema auto-creation skipped: {e}")
    yield
    await engine.dispose()


# Import portal routers for seamless single-gateway or reverse-proxy architecture
from citizen_api.routers import (
    auth as citizen_auth,
    issues as citizen_issues,
    chatbot as citizen_chatbot,
    faq as citizen_faq,
    announcements as citizen_announcements,
    notifications as citizen_notifications
)
from officer_api.routers import (
    auth as officer_auth,
    queue as officer_queue,
    issues as officer_issues
)
from admin_api.routers import (
    auth as admin_auth,
    users as admin_users,
    issues as admin_issues,
    analytics as admin_analytics,
    credibility as admin_credibility,
    blocks as admin_blocks,
    announcements as admin_announcements,
    sla_config as admin_sla_config,
    knowledge_base as admin_knowledge_base
)

app = FastAPI(
    title=f"{settings.APP_NAME} - Centralized API Gateway",
    description=(
        "Unified Municipal API Gateway orchestrating all requests across Citizen, "
        "Field Officer, and Admin portals with centralized authentication, "
        "rate limiting, and CORS enforcement."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# 1. Global Standardized Exception Handling
register_exception_handlers(app)

# 2. Centralized Authentication Gateway Middleware
app.add_middleware(
    AuthenticationMiddleware,
    public_paths={
        "/",
        "/health",
        "/healthz",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/favicon.ico"
    },
    public_path_patterns=[
        r"^/citizen/auth/.*",
        r"^/citizen/faq/?.*",
        r"^/citizen/announcements/?.*",
        r"^/citizen/chatbot/?.*",
        r"^/officer/auth/.*",
        r"^/admin/auth/.*"
    ]
)

# 3. Global CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# 4. Centralized Mounts for Portals under API Gateway
# ------------------------------------------------------------------------------

# --- Citizen Portal Routes (/citizen) ---
app.include_router(citizen_auth.router, prefix="/citizen")
app.include_router(citizen_issues.router, prefix="/citizen")
app.include_router(citizen_chatbot.router, prefix="/citizen")
app.include_router(citizen_faq.router, prefix="/citizen")
app.include_router(citizen_announcements.router, prefix="/citizen")
app.include_router(citizen_notifications.router, prefix="/citizen")

# --- Officer Dashboard Routes (/officer) ---
app.include_router(officer_auth.router, prefix="/officer")
app.include_router(officer_queue.router, prefix="/officer")
app.include_router(officer_issues.router, prefix="/officer")

# --- Admin Dashboard Routes (/admin) ---
app.include_router(admin_auth.router, prefix="/admin")
app.include_router(admin_users.router, prefix="/admin")
app.include_router(admin_issues.router, prefix="/admin")
app.include_router(admin_analytics.router, prefix="/admin")
app.include_router(admin_credibility.router, prefix="/admin")
app.include_router(admin_blocks.router, prefix="/admin")
app.include_router(admin_announcements.router, prefix="/admin")
app.include_router(admin_sla_config.router, prefix="/admin")
app.include_router(admin_knowledge_base.router, prefix="/admin")


@app.get("/health", tags=["Central Gateway Health"])
@app.get("/healthz", tags=["Central Gateway Health"])
@app.get("/", tags=["Central Gateway Health"])
async def gateway_health():
    """
    Central Gateway Health Status and Portal Routing Discovery.
    """
    return {
        "status": "healthy",
        "service": "api-gateway",
        "version": "1.0.0",
        "portals": {
            "citizen": "/citizen",
            "officer": "/officer",
            "admin": "/admin"
        },
        "docs": "/docs",
        "environment": settings.ENVIRONMENT
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("gateway_api.main:app", host="0.0.0.0", port=8000, reload=True)
