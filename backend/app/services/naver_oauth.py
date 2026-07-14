"""네이버 OAuth (토큰 교환·프로필) — Client Secret은 백엔드만."""

from __future__ import annotations

import httpx

from app.config import settings

NAVER_AUTHORIZE = "https://nid.naver.com/oauth2.0/authorize"
NAVER_TOKEN = "https://nid.naver.com/oauth2.0/token"
NAVER_PROFILE = "https://openapi.naver.com/v1/nid/me"


def require_naver_credentials() -> tuple[str, str]:
    client_id = settings.naver_client_id.strip()
    client_secret = settings.naver_client_secret.strip()
    if not client_id or not client_secret:
        raise RuntimeError("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 이 설정되지 않았습니다.")
    return client_id, client_secret


def build_authorize_url(redirect_uri: str, state: str) -> str:
    client_id, _ = require_naver_credentials()
    from urllib.parse import urlencode

    params = urlencode(
        {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "state": state,
        }
    )
    return f"{NAVER_AUTHORIZE}?{params}"


def exchange_code(code: str, state: str, redirect_uri: str) -> str:
    client_id, client_secret = require_naver_credentials()
    from urllib.parse import urlencode

    params = urlencode(
        {
            "grant_type": "authorization_code",
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "state": state,
            "redirect_uri": redirect_uri,
        }
    )
    with httpx.Client(timeout=20.0) as client:
        res = client.get(f"{NAVER_TOKEN}?{params}", headers={"Accept": "application/json"})
    if res.status_code >= 400:
        raise RuntimeError(f"네이버 토큰 교환 실패 ({res.status_code})")
    body = res.json()
    token = body.get("access_token")
    if not token:
        raise RuntimeError(body.get("error_description") or body.get("error") or "access_token 없음")
    return token


def fetch_profile(access_token: str) -> dict:
    with httpx.Client(timeout=20.0) as client:
        res = client.get(
            NAVER_PROFILE,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
        )
    if res.status_code >= 400:
        raise RuntimeError(f"네이버 프로필 조회 실패 ({res.status_code})")
    body = res.json()
    profile = body.get("response") or {}
    if not profile.get("id"):
        raise RuntimeError(body.get("message") or "네이버 프로필에 id가 없습니다.")
    return {
        "id": str(profile["id"]),
        "email": (profile.get("email") or "").strip() or None,
        "nickname": (profile.get("nickname") or "").strip() or None,
        "name": (profile.get("name") or "").strip() or None,
        "profile_image": profile.get("profile_image") or None,
    }
