from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.exceptions import register_exception_handlers
from core.middleware import AuthenticationMiddleware
from admin_api.routers import (
    auth,
    users,
    issues,
    analytics,
    credibility,
    blocks,
    announcements,
    sla_config,
    knowledge_base
)

app = FastAPI(
    title=f"{settings.APP_NAME} - Admin Portal API",
    description="Municipal Administration REST API for user provisioning, low-credibility oversight, progressive blocking, SLA policy, RAG training, and city-wide analytics.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

register_exception_handlers(app)

app.add_middleware(
    AuthenticationMiddleware,
    public_paths={"/", "/health", "/healthz", "/docs", "/redoc", "/openapi.json"},
    public_path_patterns=[
        r"^/auth/login/?$",
        r"^/auth/refresh/?$",
        r"^/admin/auth/login/?$",
        r"^/admin/auth/refresh/?$"
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Unprefixed & prefixed mounts
app.include_router(auth.router)
app.include_router(auth.router, prefix="/admin")

app.include_router(users.router)
app.include_router(users.router, prefix="/admin")

app.include_router(issues.router)
app.include_router(issues.router, prefix="/admin")

app.include_router(analytics.router)
app.include_router(analytics.router, prefix="/admin")

app.include_router(credibility.router)
app.include_router(credibility.router, prefix="/admin")

app.include_router(blocks.router)
app.include_router(blocks.router, prefix="/admin")

app.include_router(announcements.router)
app.include_router(announcements.router, prefix="/admin")

app.include_router(sla_config.router)
app.include_router(sla_config.router, prefix="/admin")

app.include_router(knowledge_base.router)
app.include_router(knowledge_base.router, prefix="/admin")


@app.get("/health", tags=["System Health"])
@app.get("/healthz", tags=["System Health"])
@app.get("/", tags=["System Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "admin-api",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("admin_api.main:app", host="0.0.0.0", port=settings.ADMIN_API_PORT, reload=True)
