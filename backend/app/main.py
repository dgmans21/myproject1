from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import appointments, places, profiles, room_votes, rooms

app = FastAPI(
    title="우리지금만나 API",
    description="스마트 약속 관리 - 이동 시간 예측 & 2단계 투표 & 신뢰도 칭호",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profiles.router, prefix="/api/v1")
app.include_router(rooms.router, prefix="/api/v1")
app.include_router(room_votes.router, prefix="/api/v1")
app.include_router(appointments.router, prefix="/api/v1")
app.include_router(places.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "woorijigeum-manna-api"}
