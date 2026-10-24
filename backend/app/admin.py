"""Admin bootstrap helper and command-line entry point."""

import argparse
import os
from getpass import getpass

from email_validator import EmailNotValidError, validate_email

from app.db import create_schema
from app.services.auth import ensure_admin

__all__ = ["ensure_admin", "main"]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Create or promote a dealership admin")
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL"),
        help="PostgreSQL URL (defaults to DATABASE_URL)",
    )
    parser.add_argument(
        "--password-env",
        metavar="NAME",
        help="Read the password from an environment variable instead of prompting",
    )
    args = parser.parse_args(argv)

    if not args.database_url:
        parser.error("Set DATABASE_URL or provide --database-url")
    try:
        email = validate_email(args.email, check_deliverability=False).normalized.lower()
    except EmailNotValidError as exc:
        parser.error(str(exc))

    password = os.getenv(args.password_env) if args.password_env else getpass("Admin password: ")
    if not password or not 8 <= len(password) <= 128:
        parser.error("Admin password must be between 8 and 128 characters")

    create_schema(args.database_url)
    ensure_admin(args.database_url, email, password)
    print(f"Admin ready: {email}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
