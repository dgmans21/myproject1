from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings
from app.services.debug import has_unlimited_access

security = HTTPBearer(auto_error=False)


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증이 필요합니다",
        )
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")
        return user_id
    except JWTError as e:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다") from e


async def get_debug_unlimited_flag(user_id: str = Depends(get_current_user_id)) -> bool:
    """ADMIN 세션: 월 5회 제한·투표 마감 등 무제한 디버그 패스."""
    return has_unlimited_access(user_id)
