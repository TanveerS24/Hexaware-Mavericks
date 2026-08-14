import pytest
from core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
    hash_token,
    generate_secure_token
)
from core.exceptions import UnauthorizedError


def test_password_hashing():
    plain = "SuperSecretPassword123!"
    hashed = hash_password(plain)
    assert hashed != plain
    assert verify_password(plain, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_flow():
    token = create_access_token(
        user_id=42,
        role="officer",
        department_id=3,
        name="Officer Test"
    )
    assert isinstance(token, str)

    payload = decode_token(token)
    assert payload["user_id"] == 42
    assert payload["role"] == "officer"
    assert payload["department_id"] == 3
    assert payload["name"] == "Officer Test"


def test_secure_random_token():
    t1 = generate_secure_token()
    t2 = generate_secure_token()
    assert t1 != t2
    assert len(t1) > 20
    assert hash_token(t1) != hash_token(t2)
