from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.exceptions import register_exception_handlers
from core.middleware import AuthenticationMiddleware
from callcentre_api.routers import auth, queue, issues

app = FastAPI(
    title=f"{settings.APP_NAME} - Call Centre Portal API",
    description="Call Centre Agent REST API for reviewing, forwarding, manual grievance logging, and direct resolution.",
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
        r"^/callcentre/auth/login/?$",
        r"^/callcentre/auth/refresh/?$"
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
app.include_router(auth.router, prefix="/callcentre")

app.include_router(queue.router)
app.include_router(queue.router, prefix="/callcentre")

app.include_router(issues.router)
app.include_router(issues.router, prefix="/callcentre")


@app.get("/health", tags=["System Health"])
@app.get("/healthz", tags=["System Health"])
@app.get("/", tags=["System Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "callcentre-api",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("callcentre_api.main:app", host="0.0.0.0", port=settings.CALLCENTRE_API_PORT, reload=True)
