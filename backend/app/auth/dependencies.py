"""Compatibility exports for existing auth dependency imports."""

from app.routers.dependencies import bearer_scheme, require_admin, require_user

__all__ = ["bearer_scheme", "require_admin", "require_user"]
