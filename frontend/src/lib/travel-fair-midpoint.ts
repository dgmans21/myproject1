import { api, type TravelTimeResponse } from "@/lib/api";
import { buildTravelFairCandidates } from "@/lib/geo-midpoint";

export type TravelFairScore = {
  center: { lat: number; lng: number };
  /** 가장 오래 걸리는 사람(분) — 최소화 목표 */
  maxMinutes: number;
  sumMinutes: number;
  maxKm: number;
};

async function scoreCandidate(
  origins: Array<{ lat: number; lng: number }>,
  center: { lat: number; lng: number }
): Promise<TravelFairScore | null> {
  try {
    const results: TravelTimeResponse[] = await Promise.all(
      origins.map((o) =>
        api.places.travelTime({
          origin_lat: o.lat,
          origin_lng: o.lng,
          dest_lat: center.lat,
          dest_lng: center.lng,
        })
      )
    );
    const mins = results.map((r) => r.duration_minutes);
    const kms = results.map((r) => r.distance_meters / 1000);
    return {
      center,
      maxMinutes: Math.max(...mins),
      sumMinutes: mins.reduce((a, b) => a + b, 0),
      maxKm: Math.max(...kms),
    };
  } catch {
    return null;
  }
}

/**
 * 카카오 길찾기 기준 — 후보점 중 «가장 오래 걸리는 사람»의 시간을 최소화.
 * (API 호출 수 ≈ 후보수 × 출발지 수)
 */
export async function findTravelFairMidpoint(
  origins: Array<{ lat: number; lng: number }>,
  signal?: { cancelled: boolean }
): Promise<TravelFairScore | null> {
  if (origins.length < 2) return null;

  const candidates = buildTravelFairCandidates(origins);
  let best: TravelFairScore | null = null;

  // 후보를 2개씩 묶어 과도한 동시 요청 완화
  for (let i = 0; i < candidates.length; i += 2) {
    if (signal?.cancelled) return null;
    const batch = candidates.slice(i, i + 2);
    const scores = await Promise.all(batch.map((c) => scoreCandidate(origins, c)));
    for (const s of scores) {
      if (!s) continue;
      if (
        !best ||
        s.maxMinutes < best.maxMinutes ||
        (s.maxMinutes === best.maxMinutes && s.sumMinutes < best.sumMinutes)
      ) {
        best = s;
      }
    }
  }

  if (!best || signal?.cancelled) return best;

  // 1회 보정: 최악 출발지 쪽으로 살짝 당긴 점과 비교
  const refinementOrigins = origins;
  const times = await Promise.all(
    refinementOrigins.map((o) =>
      api.places.travelTime({
        origin_lat: o.lat,
        origin_lng: o.lng,
        dest_lat: best!.center.lat,
        dest_lng: best!.center.lng,
      })
    )
  );
  if (signal?.cancelled) return best;

  let farIdx = 0;
  let farMin = -1;
  times.forEach((t, idx) => {
    if (t.duration_minutes > farMin) {
      farMin = t.duration_minutes;
      farIdx = idx;
    }
  });
  const far = origins[farIdx]!;
  const nudged = {
    lat: best.center.lat + (far.lat - best.center.lat) * 0.25,
    lng: best.center.lng + (far.lng - best.center.lng) * 0.25,
  };
  const nudgedScore = await scoreCandidate(origins, nudged);
  if (
    nudgedScore &&
    (nudgedScore.maxMinutes < best.maxMinutes ||
      (nudgedScore.maxMinutes === best.maxMinutes &&
        nudgedScore.sumMinutes < best.sumMinutes))
  ) {
    best = nudgedScore;
  }

  return best;
}
