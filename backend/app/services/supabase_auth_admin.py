"""Supabase Auth Admin (service role) — GoTrue REST."""

from __future__ import annotations

import re

import httpx

from app.config import settings


def _admin_headers() -> dict[str, str]:
    key = settings.supabase_service_key.strip()
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def _auth_base() -> str:
    return settings.supabase_url.rstrip("/") + "/auth/v1"


def is_already_registered_error(message: str | None) -> bool:
    if not message:
        return False
    return bool(re.search(r"already|registered|exists|duplicate", message, re.I))


def ensure_user_and_magiclink_token(profile: dict) -> str:
    """네이버 프로필 → auth.users upsert 후 magiclink hashed_token 반환."""
    email = (profile.get("email") or "").strip().lower()
    if not email:
        raise RuntimeError(
            "네이버 이메일 동의가 필요합니다. 네이버 개발자센터에서 이메일을 허용해 주세요."
        )

    meta = {
        "naver_id": profile["id"],
        "display_name": profile.get("nickname")
        or profile.get("name")
        or email.split("@")[0],
        "full_name": profile.get("name"),
        "avatar_url": profile.get("profile_image"),
        "auth_provider": "naver",
    }

    created_error: str | None = None
    user_id: str | None = None

    with httpx.Client(timeout=30.0) as client:
        create_res = client.post(
            f"{_auth_base()}/admin/users",
            headers=_admin_headers(),
            json={
                "email": email,
                "email_confirm": True,
                "user_metadata": meta,
            },
        )
        if create_res.status_code < 400:
            data = create_res.json()
            user_id = data.get("id")
            if not user_id and isinstance(data.get("user"), dict):
                user_id = data["user"].get("id")
            if user_id:
                user_id = str(user_id)
        else:
            try:
                err_body = create_res.json()
                created_error = (
                    err_body.get("msg")
                    or err_body.get("message")
                    or err_body.get("error_description")
                    or create_res.text
                )
            except Exception:
                created_error = create_res.text
            if not is_already_registered_error(created_error):
                raise RuntimeError(created_error or f"유저 생성 실패 ({create_res.status_code})")

        link_res = client.post(
            f"{_auth_base()}/admin/generate_link",
            headers=_admin_headers(),
            json={"type": "magiclink", "email": email},
        )
        if link_res.status_code >= 400:
            raise RuntimeError(f"로그인 링크 생성 실패 ({link_res.status_code}): {link_res.text}")

        link_data = link_res.json()
        props = link_data.get("properties") or {}
        hashed = props.get("hashed_token")
        if not hashed:
            raise RuntimeError("Supabase hashed_token 이 없습니다.")

        link_user = link_data.get("user") or {}
        link_user_id = link_user.get("id")
        if created_error and link_user_id:
            client.put(
                f"{_auth_base()}/admin/users/{link_user_id}",
                headers=_admin_headers(),
                json={"user_metadata": meta},
            )
        elif user_id is None and link_user_id:
            pass

    return hashed
