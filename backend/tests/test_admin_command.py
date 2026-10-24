"""A reviewer can create the first admin from a shell command."""

import os
import subprocess
import sys
from uuid import uuid4

import psycopg


def test_admin_command_creates_the_first_admin(database_url):
    email = f"bootstrap-{uuid4().hex}@example.com"
    environment = {
        **os.environ,
        "DATABASE_URL": database_url,
        "ADMIN_BOOTSTRAP_PASSWORD": "admin-password-123",
    }

    try:
        result = subprocess.run(
            [
                sys.executable,
                "-m",
                "app.admin",
                "--email",
                email,
                "--password-env",
                "ADMIN_BOOTSTRAP_PASSWORD",
            ],
            env=environment,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )

        assert result.returncode == 0, result.stderr
        with psycopg.connect(database_url) as connection:
            role = connection.execute(
                "SELECT role FROM users WHERE email = %s", (email,)
            ).fetchone()
        assert role == ("admin",)
    finally:
        with psycopg.connect(database_url) as connection:
            connection.execute("DELETE FROM users WHERE email = %s", (email,))
