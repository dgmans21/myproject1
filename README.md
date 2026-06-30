# 우리지금만나 — 스마트 약속 관리

이동 시간 예측과 2단계 투표로 약속 확정 성공률을 높이는 스마트 약속 관리 앱입니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11+ |
| Database / Auth | Supabase (PostgreSQL + Auth + RLS) |
| Maps | Kakao Maps / Mobility API |

## 핵심 기능

- **2단계 스마트 투표** — 1차 날짜 투표 → 2차 시간 타겟 투표
- **이동 시간 예측** — 출발지 기준 경로·소요 시간 안내
- **신뢰도 & 칭호** — 장소 추천 신뢰도, 프로필 칭호
- **맛집 등급** — 5점(최대 5곳) · 4.5점(월 5회) 평점 정책
- **유연한 방** — 일회성 방 ↔ 정식 그룹
- **약속 잔디** — 모임 이행 빈도 시각화
- **모임 결산** — 센스킹 / 프로 여정러


## 로컬 점검 (최소)

| 목적 | 필요한 설정 | 확인 방법 |
|------|-------------|-----------|
| **UI·mock 플로우** | `frontend/.env.local` (Kakao 지도만 있어도 됨) | `cd frontend && npm run dev` → http://localhost:3000 |
| **백엔드 API** | `backend/.env` (Supabase 3종) | `cd backend && uvicorn app.main:app --reload --port 8000` |
| **DB 연결** | Supabase + `supabase/migrations/` 001→014 순 적용 | http://localhost:8000/health/db |
| **Swagger** | 백엔드 실행 중 | http://localhost:8000/docs |

```bash
# frontend/.env.local  ← NEXT_PUBLIC_* (Supabase·Kakao·API URL)
# backend/.env         ← SUPABASE_* (서비스 롤 — frontend와 별도 파일)
```

템플릿: `frontend/.env.example`, `backend/.env.example` 복사 후 값 입력.

> **참고:** 프론트는 아직 `src/lib/api.ts` mock을 사용합니다. `.env.local`의 Supabase/API URL만 넣어도 **화면 데이터는 mock**이고, 실DB 연동은 백엔드·마이그레이션·HTTP 연결 작업 후 가능합니다.

내부 상세 가이드: `DEVELOPERS.local.md` (로컬 전용, git 미포함)

## 라이선스

MIT
