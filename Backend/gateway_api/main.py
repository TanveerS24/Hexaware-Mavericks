from contextlib import asynccontextmanager
import logging
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
import httpx
# pyrefly: ignore [missing-import]
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
            # await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
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
    issues as officer_issues,
    notifications as officer_notifications
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

from core.services.websocket_manager import ws_manager
from fastapi import WebSocket, WebSocketDisconnect

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
        r"^/auth/.*",
        r"^/admin/auth/.*",
        r"^/ws/.*"
    ]
)

# 3. Global CORS Middleware
# NOTE: allow_credentials=True is incompatible with allow_origins=["*"].
# Explicitly list all dev + production origins.
CORS_ALLOW_ORIGINS = settings.CORS_ORIGINS if settings.CORS_ORIGINS != ["*"] else [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
    "http://127.0.0.1:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# 4. Centralized Mounts for Portals under API Gateway
# ------------------------------------------------------------------------------

# Direct Auth aliases
app.include_router(officer_auth.router, prefix="")

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
app.include_router(officer_notifications.router, prefix="")

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
    Central Gateway Health Status, Database Connectivity, and Portal Discovery.
    """
    db_status = "unknown"
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1;"))
            db_status = "connected"
    except Exception as e:
        db_status = f"disconnected ({str(e).splitlines()[0] if str(e) else 'error'})"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
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


@app.websocket("/ws/admin")
@app.websocket("/ws/events")
async def websocket_admin_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time live map updates, grievance status changes,
    and officer assignment notifications for admin dashboards.
    """
    await ws_manager.connect_admin(websocket)
    try:
        while True:
            # Keep socket alive and accept ping/heartbeat or broadcast payloads
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type": "pong"}')
            else:
                try:
                    import json
                    payload = json.loads(data)
                    await ws_manager.broadcast_json(payload)
                except Exception:
                    pass
    except WebSocketDisconnect:
        ws_manager.disconnect_admin(websocket)
    except Exception:
        ws_manager.disconnect_admin(websocket)


if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import uvicorn
    uvicorn.run("gateway_api.main:app", host="0.0.0.0", port=8000, reload=True)
