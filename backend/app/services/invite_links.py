import secrets
from datetime import datetime, timedelta, timezone


def generate_invite_token() -> str:
    return secrets.token_urlsafe(32).replace("-", "").replace("_", "")[:48]


def default_invite_expiry(days: int = 14) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)
