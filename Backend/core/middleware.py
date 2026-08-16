import re
from typing import List, Optional, Set
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from fastapi import status
from core.security import decode_token
from core.exceptions import UnauthorizedError


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """
    Centralized authentication middleware that validates JWT tokens on all routes
    except explicitly excluded public paths.
    """
    def __init__(
        self,
        app,
        public_path_patterns: Optional[List[str]] = None,
        public_paths: Optional[Set[str]] = None
    ):
        super().__init__(app)
        
        # Exact matching public paths
        self.public_paths: Set[str] = {
            "/",
            "/health",
            "/healthz",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/favicon.ico"
        }
        if public_paths:
            self.public_paths.update(public_paths)

        # Regex patterns for public paths (e.g. auth routes, public FAQ, announcements)
        self.public_patterns = [
            r"^/auth/login/?$",
            r"^/auth/register/?$",
            r"^/auth/refresh/?$",
            r"^/citizen/auth/login/?$",
            r"^/citizen/auth/register/?$",
            r"^/citizen/auth/refresh/?$",
            r"^/officer/auth/login/?$",
            r"^/officer/auth/refresh/?$",
            r"^/admin/auth/login/?$",
            r"^/admin/auth/refresh/?$",
            r"^/faq/?.*$",
            r"^/announcements/?.*$",
            r"^/citizen/faq/?.*$",
            r"^/citizen/announcements/?.*$"
        ]
        if public_path_patterns:
            self.public_patterns.extend(public_path_patterns)

        self._compiled_patterns = [re.compile(p) for p in self.public_patterns]

    def _is_public(self, path: str) -> bool:
        """Check if request path is exempted from mandatory authentication."""
        if path in self.public_paths:
            return True
        for pattern in self._compiled_patterns:
            if pattern.match(path):
                return True
        return False

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Preflight CORS requests are always allowed
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path

        # If the endpoint is public, allow it through without enforcing auth
        if self._is_public(path):
            # If a token is provided anyway, parse and attach payload opportunistically
            auth_header = request.headers.get("Authorization")
            cookie_token = request.cookies.get("access_token")
            token = None
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header[7:].strip()
            elif cookie_token:
                token = cookie_token

            if token:
                try:
                    payload = decode_token(token)
                    request.state.user_payload = payload
                except Exception:
                    request.state.user_payload = None
            else:
                request.state.user_payload = None

            return await call_next(request)

        # For protected routes, extract and verify token
        auth_header = request.headers.get("Authorization")
        cookie_token = request.cookies.get("access_token")
        token = None

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
        elif cookie_token:
            token = cookie_token

        if not token:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "error_code": "UNAUTHORIZED",
                    "message": "Authentication required. Missing Bearer token or access cookie.",
                    "detail": None
                }
            )

        try:
            payload = decode_token(token)
            request.state.user_payload = payload
        except UnauthorizedError as exc:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "error_code": exc.error_code,
                    "message": exc.message,
                    "detail": None
                }
            )
        except Exception:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "error_code": "INVALID_TOKEN",
                    "message": "Invalid or expired token",
                    "detail": None
                }
            )

        return await call_next(request)
