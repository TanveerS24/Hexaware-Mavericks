from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.exceptions import register_exception_handlers
from core.middleware import AuthenticationMiddleware
from officer_api.routers import auth, queue, issues

app = FastAPI(
    title=f"{settings.APP_NAME} - Officer Portal API",
    description="Department Field Officer REST API for claiming grievances, updating resolution status, and reporting fraud.",
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
        r"^/officer/auth/login/?$",
        r"^/officer/auth/refresh/?$"
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(auth.router, prefix="/officer")

app.include_router(queue.router)
app.include_router(queue.router, prefix="/officer")

app.include_router(issues.router)
app.include_router(issues.router, prefix="/officer")


@app.get("/health", tags=["System Health"])
@app.get("/healthz", tags=["System Health"])
@app.get("/", tags=["System Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "officer-api",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("officer_api.main:app", host="0.0.0.0", port=settings.OFFICER_API_PORT, reload=True)
