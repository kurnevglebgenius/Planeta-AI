"""FastAPI application factory."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response

from app.api.health import router as health_router
from app.api.v1.employees import router as employees_router
from app.api.v1.files import router as files_router
from app.api.v1.locations import router as locations_router
from app.api.v1.session import router as session_router
from app.core.config import get_settings
from app.core.errors import error_response, http_error, validation_error

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Planeta AI API", version="0.1.0", docs_url=None, redoc_url=None)
    app.state.environment = settings.app_env
    app.add_exception_handler(StarletteHTTPException, http_error)
    app.add_exception_handler(RequestValidationError, validation_error)

    @app.middleware("http")
    async def catch_unhandled(request: Request, call_next: RequestResponseEndpoint) -> Response:
        try:
            return await call_next(request)
        except Exception as exc:
            logger.error("Unhandled API error: %s", type(exc).__name__)
            return error_response(500, "internal_error", "Internal server error")

    if settings.web_origin:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[settings.web_origin],
            allow_methods=["GET", "POST", "PUT"],
            allow_headers=["Authorization", "Content-Type"],
        )
    app.include_router(health_router)
    app.include_router(session_router)
    app.include_router(employees_router)
    app.include_router(locations_router)
    app.include_router(files_router)
    return app


app = create_app()
