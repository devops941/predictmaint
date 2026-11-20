import pytest
from pydantic import ValidationError
from app.core.config import Settings

def test_config_fail_fast_missing_uri():
    with pytest.raises(ValueError):
        Settings(
            MONGODB_URI="",
            JWT_SECRET="valid_length_jwt_secret_key_12345"
        )

def test_config_fail_fast_placeholder_uri():
    with pytest.raises(ValueError):
        Settings(
            MONGODB_URI="<paste-your-atlas-uri-here-locally-only>",
            JWT_SECRET="valid_length_jwt_secret_key_12345"
        )

def test_config_fail_fast_short_jwt_secret():
    with pytest.raises(ValueError):
        Settings(
            MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/",
            JWT_SECRET="short"
        )

def test_config_sanitized_uri():
    s = Settings(
        MONGODB_URI="mongodb+srv://admin:superSecret123@cluster0.uurxkmz.mongodb.net/",
        JWT_SECRET="valid_length_jwt_secret_key_12345"
    )
    sanitized = s.sanitized_uri()
    assert "superSecret123" not in sanitized
    assert ":***@" in sanitized
