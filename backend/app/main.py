from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import get_supabase
from app.games.engine.registry import ensure_registered
from app.games.engine.tick import start_tick_loop
from app.routers import (
    analytics,
    appointments,
    auth_naver,
    friends,
    games,
    host_transfer,
    places,
    profiles,
    room_votes,
    rooms,
    saved_locations,
    team_schedule,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_registered()
    start_tick_loop()
    yield


app = FastAPI(
    title="우리지금만나 API",
    description="스마트 약속 관리 - 이동 시간 예측 & 2단계 투표 & 신뢰도 칭호",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profiles.router, prefix="/api/v1")
app.include_router(auth_naver.router, prefix="/api/v1")
app.include_router(friends.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(rooms.router, prefix="/api/v1")
app.include_router(host_transfer.router, prefix="/api/v1")
app.include_router(team_schedule.router, prefix="/api/v1")
app.include_router(room_votes.router, prefix="/api/v1")
app.include_router(games.router, prefix="/api/v1")
app.include_router(appointments.router, prefix="/api/v1")
app.include_router(places.router, prefix="/api/v1")
app.include_router(saved_locations.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "woorijigeum-manna-api"}


@app.get("/health/db")
async def health_db():
    """backend/.env + Supabase 연결 점검용 (마이그레이션 적용 여부는 별도 확인)"""
    if not settings.supabase_url.strip() or not settings.supabase_service_key.strip():
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_configured",
                "message": "backend/.env에 SUPABASE_URL, SUPABASE_SERVICE_KEY를 설정하세요.",
            },
        )
    try:
        sb = get_supabase()
        sb.table("profiles").select("id").limit(1).execute()
        return {"status": "ok", "db": "connected", "supabase_url": settings.supabase_url}
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "db": "connection_failed", "detail": str(exc)},
        )
