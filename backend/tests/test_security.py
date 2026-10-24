"""Unit tests for password hashing and JWT helpers (no database needed)."""

from datetime import timedelta

import pytest

from app.security import (
    InvalidTokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

SECRET = "test-secret-key-that-is-at-least-32-bytes-long"


def test_verify_password_accepts_the_original_password():
    hashed = hash_password("secret-password-123")

    assert verify_password("secret-password-123", hashed) is True


def test_verify_password_rejects_a_wrong_password():
    hashed = hash_password("secret-password-123")

    assert verify_password("not-the-password", hashed) is False


def test_hash_password_is_salted_and_never_plaintext():
    first = hash_password("secret-password-123")
    second = hash_password("secret-password-123")

    assert first != second
    assert "secret-password-123" not in first


def test_verify_password_returns_false_for_a_malformed_hash():
    assert verify_password("secret-password-123", "not-a-valid-hash") is False


def test_verify_password_rejects_an_unknown_hash_algorithm():
    pbkdf2_hash = hash_password("secret-password-123")
    md5_labelled = "md5" + pbkdf2_hash.removeprefix("pbkdf2_sha256")

    assert verify_password("secret-password-123", md5_labelled) is False


def test_access_token_round_trips_subject_and_role():
    token = create_access_token("user-1", "admin", SECRET)

    claims = decode_access_token(token, SECRET)

    assert claims["sub"] == "user-1"
    assert claims["role"] == "admin"
    assert "exp" in claims


def test_decode_rejects_a_token_signed_with_another_secret():
    token = create_access_token("user-1", "user", "another-secret-that-is-also-32-bytes-long")

    with pytest.raises(InvalidTokenError):
        decode_access_token(token, SECRET)


def test_decode_rejects_an_expired_token():
    token = create_access_token("user-1", "user", SECRET, expires_in=timedelta(seconds=-1))

    with pytest.raises(InvalidTokenError):
        decode_access_token(token, SECRET)


def test_decode_rejects_garbage():
    with pytest.raises(InvalidTokenError):
        decode_access_token("not.a.jwt", SECRET)
