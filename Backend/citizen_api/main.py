from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.exceptions import register_exception_handlers
from core.middleware import AuthenticationMiddleware
from citizen_api.routers import auth, issues, chatbot, faq, announcements, notifications, emergency

app = FastAPI(
    title=f"{settings.APP_NAME} - Citizen Portal API",
    description="Citizen-facing REST API for submitting grievances, tracking status, AI chatbot copilot, FAQs, and announcements.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Exception Handlers
register_exception_handlers(app)

# Authentication Middleware
app.add_middleware(
    AuthenticationMiddleware,
    public_paths={"/", "/health", "/healthz", "/docs", "/redoc", "/openapi.json"},
    public_path_patterns=[
        r"^/auth/.*",
        r"^/citizen/auth/.*",
        r"^/faq/?.*",
        r"^/citizen/faq/?.*",
        r"^/announcements/?.*",
        r"^/citizen/announcements/?.*",
        r"^/chatbot/?.*",
        r"^/citizen/chatbot/?.*",
        r"^/emergency/?.*",
        r"^/citizen/emergency/?.*"
    ]
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers (with both unprefixed and /citizen prefixed mounts for reverse proxy flexibility)
app.include_router(auth.router)
app.include_router(auth.router, prefix="/citizen")

app.include_router(issues.router)
app.include_router(issues.router, prefix="/citizen")

app.include_router(chatbot.router)
app.include_router(chatbot.router, prefix="/citizen")

app.include_router(faq.router)
app.include_router(faq.router, prefix="/citizen")

app.include_router(announcements.router)
app.include_router(announcements.router, prefix="/citizen")

app.include_router(notifications.router)
app.include_router(notifications.router, prefix="/citizen")

app.include_router(emergency.router)
app.include_router(emergency.router, prefix="/citizen")


@app.get("/health", tags=["System Health"])
@app.get("/healthz", tags=["System Health"])
@app.get("/", tags=["System Health"])
async def health_check():
    """Health check endpoint for container orchestrators and status monitoring."""
    return {
        "status": "healthy",
        "service": "citizen-api",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("citizen_api.main:app", host="0.0.0.0", port=settings.CITIZEN_API_PORT, reload=True)
