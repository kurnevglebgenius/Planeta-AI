"""Stable, privacy-safe API error responses."""

from collections.abc import Mapping

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException


def error_response(status_code: int, code: str, message: str, headers: Mapping[str, str] | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
        headers=headers,
    )


async def http_error(_request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, HTTPException)
    codes = {
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        429: "rate_limited",
        503: "unavailable",
    }
    code = (
        "last_owner_guard"
        if exc.status_code == 409 and exc.detail == "Last OWNER or assignment guard"
        else codes.get(exc.status_code, "request_failed")
    )
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return error_response(exc.status_code, code, message, exc.headers)


async def validation_error(_request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    return error_response(422, "invalid_request", "Invalid request")
