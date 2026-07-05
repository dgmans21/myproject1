import time

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt

from app.config import settings
from app.services.debug import has_unlimited_access

security = HTTPBearer(auto_error=False)

_jwks_cache: dict | None = None
_jwks_fetched_at: float = 0.0
_JWKS_TTL_SECONDS = 3600


def _jwks_url() -> str:
    return f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"


def _fetch_jwks(*, force: bool = False) -> dict:
    global _jwks_cache, _jwks_fetched_at
    now = time.time()
    if not force and _jwks_cache and (now - _jwks_fetched_at) < _JWKS_TTL_SECONDS:
        return _jwks_cache
    resp = httpx.get(_jwks_url(), timeout=10)
    resp.raise_for_status()
    _jwks_cache = resp.json()
    _jwks_fetched_at = now
    return _jwks_cache


def _find_jwk(jwks: dict, kid: str | None) -> dict | None:
    keys = jwks.get("keys") or []
    if kid:
        for key in keys:
            if key.get("kid") == kid:
                return key
    return keys[0] if len(keys) == 1 else None


def decode_supabase_jwt(token: str) -> dict:
    """Supabase Auth JWT 검증 (신규 ES256 JWKS + 레거시 HS256)."""
    header = jwt.get_unverified_header(token)
    alg = header.get("alg", "HS256")

    if alg == "HS256":
        if not settings.supabase_jwt_secret:
            raise JWTError("JWT secret not configured")
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )

    if alg == "ES256":
        jwks = _fetch_jwks()
        key_data = _find_jwk(jwks, header.get("kid"))
        if not key_data:
            jwks = _fetch_jwks(force=True)
            key_data = _find_jwk(jwks, header.get("kid"))
        if not key_data:
            raise JWTError("Signing key not found")
        public_key = jwk.construct(key_data)
        return jwt.decode(
            token,
            public_key,
            algorithms=["ES256"],
            audience="authenticated",
        )

    raise JWTError(f"Unsupported algorithm: {alg}")


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증이 필요합니다",
        )
    try:
        payload = decode_supabase_jwt(credentials.credentials)
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")
        return user_id
    except JWTError as e:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다") from e


async def get_optional_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str | None:
    if not credentials:
        return None
    try:
        payload = decode_supabase_jwt(credentials.credentials)
        return payload.get("sub")
    except JWTError:
        return None


async def get_debug_unlimited_flag(user_id: str = Depends(get_current_user_id)) -> bool:
    """ADMIN 세션: 월 5회 제한·투표 마감 등 무제한 디버그 패스."""
    return has_unlimited_access(user_id)
