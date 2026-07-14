"""네이버 로그인 — FastAPI만 OAuth·service_role 담당. 세션은 프론트 verifyOtp."""

from __future__ import annotations

import secrets
from urllib.parse import urlencode

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from app.config import settings
from app.services import naver_oauth
from app.services.supabase_auth_admin import ensure_user_and_magiclink_token

router = APIRouter(prefix="/auth", tags=["auth"])

STATE_COOKIE = "naver_oauth_state"
ORIGIN_COOKIE = "naver_frontend_origin"


def _frontend_error(origin: str, message: str) -> RedirectResponse:
    q = urlencode({"auth_error": message})
    return RedirectResponse(url=f"{origin.rstrip('/')}/?{q}#auth", status_code=302)


def _allowed_frontend_origin(origin: str | None) -> str | None:
    if not origin:
        return None
    origin = origin.rstrip("/")
    allowed = {o.rstrip("/") for o in settings.cors_origin_list}
    if origin in allowed:
        return origin
    return None


def _default_frontend_origin() -> str:
    if settings.cors_origin_list:
        return settings.cors_origin_list[0].rstrip("/")
    return "http://localhost:3000"


def _callback_uri(request: Request) -> str:
    base = str(request.base_url).rstrip("/")
    return f"{base}/api/v1/auth/naver/callback"


@router.get("/naver")
async def naver_login_start(request: Request, frontend_origin: str | None = None):
    origin = _allowed_frontend_origin(frontend_origin) or _default_frontend_origin()
    try:
        state = secrets.token_hex(24)
        authorize = naver_oauth.build_authorize_url(_callback_uri(request), state)
    except Exception as exc:
        return _frontend_error(origin, str(exc))

    response = RedirectResponse(url=authorize, status_code=302)
    secure = request.url.scheme == "https"
    response.set_cookie(
        STATE_COOKIE,
        state,
        httponly=True,
        samesite="lax",
        secure=secure,
        max_age=600,
        path="/",
    )
    response.set_cookie(
        ORIGIN_COOKIE,
        origin,
        httponly=True,
        samesite="lax",
        secure=secure,
        max_age=600,
        path="/",
    )
    return response


@router.get("/naver/callback")
async def naver_login_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
):
    origin = request.cookies.get(ORIGIN_COOKIE) or _default_frontend_origin()
    origin = _allowed_frontend_origin(origin) or _default_frontend_origin()

    if error or error_description:
        return _frontend_error(origin, error_description or error or "네이버 로그인 실패")

    if not code or not state:
        return _frontend_error(origin, "네이버 로그인 응답이 올바르지 않습니다.")

    saved_state = request.cookies.get(STATE_COOKIE)
    if not saved_state or saved_state != state:
        return _frontend_error(origin, "네이버 로그인 검증에 실패했습니다. 다시 시도해 주세요.")

    try:
        redirect_uri = _callback_uri(request)
        access_token = naver_oauth.exchange_code(code, state, redirect_uri)
        profile = naver_oauth.fetch_profile(access_token)
        token_hash = ensure_user_and_magiclink_token(profile)
    except Exception as exc:
        return _frontend_error(origin, str(exc))

    q = urlencode({"token_hash": token_hash, "next": "/dashboard"})
    response = RedirectResponse(
        url=f"{origin}/auth/naver/complete?{q}",
        status_code=302,
    )
    response.delete_cookie(STATE_COOKIE, path="/")
    response.delete_cookie(ORIGIN_COOKIE, path="/")
    return response
