from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request

from app.auth import get_current_user_id, get_optional_user_id
from app.config import settings
from app.database import get_supabase
from app.models.schemas import (
    SiteVisitEventItem,
    SiteVisitListResponse,
    SiteVisitRecordRequest,
    SiteVisitTodayCountResponse,
)
from app.services.analytics_parse import (
    client_ip_from_headers,
    hash_ip,
    mask_ip,
    normalize_path,
    normalize_referrer,
    parse_user_agent,
)
from app.services.debug import is_admin_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

KST = timezone(timedelta(hours=9))


def _kst_today_start() -> datetime:
    now = datetime.now(KST)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def _require_admin(user_id: str) -> None:
    if not is_admin_user(user_id):
        raise HTTPException(status_code=403, detail="관리자만 조회할 수 있습니다")


@router.post("/visit", status_code=204)
async def record_visit(
    body: SiteVisitRecordRequest,
    request: Request,
    x_visit_session: str | None = Header(default=None, alias="X-Visit-Session"),
    user_id: str | None = Depends(get_optional_user_id),
):
    session_key = (x_visit_session or body.session_key or "").strip()
    if not session_key or len(session_key) > 128:
        raise HTTPException(status_code=400, detail="유효한 방문 세션이 필요합니다")

    ip = client_ip_from_headers(
        request.headers.get("x-forwarded-for"),
        request.client.host if request.client else None,
    )
    salt = settings.analytics_ip_salt or "dev-analytics-salt"
    ip_h = hash_ip(ip, salt)
    path = normalize_path(body.path)
    browser, os_family, ua_text = parse_user_agent(
        body.user_agent or request.headers.get("user-agent")
    )
    referrer = normalize_referrer(body.referrer)

    sb = get_supabase()
    recent = (
        sb.table("site_visit_events")
        .select("id")
        .eq("session_key", session_key)
        .eq("path", path)
        .gte("visited_at", (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat())
        .limit(1)
        .execute()
    )
    if recent.data:
        return None

    sb.table("site_visit_events").insert(
        {
            "session_key": session_key,
            "user_id": user_id,
            "path": path,
            "browser_family": browser,
            "os_family": os_family,
            "ip_hash": ip_h,
            "ip_masked": mask_ip(ip),
            "user_agent": ua_text,
            "referrer": referrer,
        }
    ).execute()
    return None


@router.get("/today-count", response_model=SiteVisitTodayCountResponse)
async def get_today_visitor_count():
    sb = get_supabase()
    start = _kst_today_start().isoformat()
    rows = (
        sb.table("site_visit_events")
        .select("session_key")
        .gte("visited_at", start)
        .execute()
    )
    unique = {r["session_key"] for r in rows.data}
    return SiteVisitTodayCountResponse(count=len(unique), date=_kst_today_start().date().isoformat())


@router.get("/visits", response_model=SiteVisitListResponse)
async def list_visits(
    user_id: str = Depends(get_current_user_id),
    date_from: str | None = Query(default=None, description="YYYY-MM-DD (KST)"),
    date_to: str | None = Query(default=None, description="YYYY-MM-DD (KST)"),
    browser: str | None = Query(default=None),
    path: str | None = Query(default=None),
    ip: str | None = Query(default=None, description="조회 IP (해시 매칭)"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    _require_admin(user_id)
    sb = get_supabase()
    query = sb.table("site_visit_events").select(
        "id, visited_at, session_key, user_id, path, browser_family, os_family, "
        "ip_hash, ip_masked, user_agent, referrer, profiles(display_name)",
        count="exact",
    )

    if date_from:
        query = query.gte("visited_at", f"{date_from}T00:00:00+09:00")
    if date_to:
        query = query.lt("visited_at", f"{date_to}T23:59:59.999999+09:00")
    if browser:
        query = query.eq("browser_family", browser.strip())
    if path:
        query = query.ilike("path", f"%{path.strip()}%")
    if ip and ip.strip():
        salt = settings.analytics_ip_salt or "dev-analytics-salt"
        query = query.eq("ip_hash", hash_ip(ip.strip(), salt))

    result = (
        query.order("visited_at", desc=True).range(offset, offset + limit - 1).execute()
    )

    items: list[SiteVisitEventItem] = []
    for row in result.data:
        prof = row.get("profiles")
        display_name = prof.get("display_name") if isinstance(prof, dict) else None
        items.append(
            SiteVisitEventItem(
                id=str(row["id"]),
                visited_at=row["visited_at"],
                session_key=row["session_key"],
                user_id=str(row["user_id"]) if row.get("user_id") else None,
                display_name=display_name,
                path=row["path"],
                browser_family=row["browser_family"],
                os_family=row["os_family"],
                ip_hash=row["ip_hash"],
                ip_masked=row.get("ip_masked"),
                user_agent=row.get("user_agent"),
                referrer=row.get("referrer"),
            )
        )

    total = result.count if result.count is not None else len(items)
    return SiteVisitListResponse(items=items, total=total, limit=limit, offset=offset)
