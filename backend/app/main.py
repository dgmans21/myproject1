from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import appointments, groups, places, profiles

app = FastAPI(
    title="MeetSync API",
    description="스마트 약속 관리 - 이동 시간 예측 & 2단계 투표",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profiles.router, prefix="/api/v1")
app.include_router(groups.router, prefix="/api/v1")
app.include_router(appointments.router, prefix="/api/v1")
app.include_router(places.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "meetsync-api"}
