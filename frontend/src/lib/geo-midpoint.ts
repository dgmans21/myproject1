/** 여러 좌표의 단순 지리 중심(평균). 이동 km가 같아지지는 않음. */
export function geographicCentroid(
  points: Array<{ lat: number; lng: number }>
): { lat: number; lng: number } | null {
  if (points.length < 2) return null;
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  );
  return {
    lat: sum.lat / points.length,
    lng: sum.lng / points.length,
  };
}

/** 두 좌표 사이 직선(대권) 거리 — 미터. 실제 도로 이동과 무관. */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * 직선 거리 기준 «가장 먼 사람»을 줄이는 점 (minimax 근사).
 * 좌표 평균보다 이동 부담 격차가 작아지는 경향. 도로·한강 우회는 반영 안 함.
 */
export function minimaxFairCenter(
  points: Array<{ lat: number; lng: number }>
): { lat: number; lng: number } | null {
  if (points.length < 2) return null;
  let c = geographicCentroid(points)!;
  for (let i = 0; i < 80; i++) {
    let far = points[0]!;
    let farD = -1;
    for (const p of points) {
      const d = haversineMeters(c, p);
      if (d > farD) {
        farD = d;
        far = p;
      }
    }
    const t = 0.4 / (1 + i * 0.04);
    c = {
      lat: c.lat + (far.lat - c.lat) * t,
      lng: c.lng + (far.lng - c.lng) * t,
    };
  }
  return c;
}

export function lerpLatLng(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  t: number
): { lat: number; lng: number } {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}

/** 이동시간 맞춤용 후보점 (좌표 평균·거리맞춤·각 출발지 쪽으로 당긴 점) */
export function buildTravelFairCandidates(
  points: Array<{ lat: number; lng: number }>
): Array<{ lat: number; lng: number }> {
  const centroid = geographicCentroid(points);
  const fair = minimaxFairCenter(points);
  if (!centroid) return [];

  const raw: Array<{ lat: number; lng: number }> = [centroid];
  if (fair) raw.push(fair);

  for (const p of points) {
    raw.push(lerpLatLng(centroid, p, 0.3));
    raw.push(lerpLatLng(centroid, p, 0.5));
    raw.push(lerpLatLng(centroid, p, 0.7));
  }

  // 거의 같은 좌표 중복 제거 (~30m)
  const unique: Array<{ lat: number; lng: number }> = [];
  for (const c of raw) {
    if (unique.some((u) => haversineMeters(u, c) < 30)) continue;
    unique.push(c);
  }
  return unique;
}

export function formatStraightDistance(meters: number): string {
  if (meters < 1000) return `약 ${Math.round(meters)}m`;
  return `약 ${(meters / 1000).toFixed(1)}km`;
}

/** 백엔드 직선 추정 응답인지 (카카오 REST 키 없을 때) */
export function isStraightLineTravelEstimate(routeSummary: string): boolean {
  return routeSummary.includes("직선");
}

export type MidpointMode = "centroid" | "fair" | "travel";

/** sync 모드만. travel은 비동기 최적화 결과 사용 */
export function resolveMidpoint(
  mode: MidpointMode,
  points: Array<{ lat: number; lng: number }>
): { lat: number; lng: number } | null {
  if (mode === "fair") return minimaxFairCenter(points);
  return geographicCentroid(points);
}
