"""Shared HTTP dependencies for configuration and bearer authentication."""

from typing import Annotated

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.security import InvalidTokenError, decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def database_url(request: Request) -> str:
    url = request.app.state.database_url
    if not url:
        raise HTTPException(status_code=503, detail="Database is not configured")
    return url


def require_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict:
    secret_key = request.app.state.secret_key
    if credentials is None or not secret_key:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        claims = decode_access_token(credentials.credentials, secret_key)
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid access token") from exc
    if claims.get("role") not in {"user", "admin"}:
        raise HTTPException(status_code=401, detail="Invalid access token")
    return claims


def require_admin(claims: Annotated[dict, Depends(require_user)]) -> dict:
    if claims["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return claims
