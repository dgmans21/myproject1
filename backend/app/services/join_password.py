import hashlib
import secrets


def hash_join_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return f"pbkdf2_sha256${salt}${digest}"


def verify_join_password(password: str, stored: str | None) -> bool:
    if not stored:
        return False
    try:
        scheme, salt, digest = stored.split("$", 2)
        if scheme != "pbkdf2_sha256":
            return False
        check = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
        return secrets.compare_digest(check, digest)
    except ValueError:
        return False
