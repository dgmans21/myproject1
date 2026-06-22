"""ADMIN 디버그 패스: 투표 한도·마감 제한 무시."""

from app.database import get_supabase


def is_admin_user(user_id: str) -> bool:
    sb = get_supabase()
    result = sb.table("profiles").select("role").eq("id", user_id).single().execute()
    if not result.data:
        return False
    return result.data.get("role") == "ADMIN"


def has_unlimited_access(user_id: str) -> bool:
    return is_admin_user(user_id)
