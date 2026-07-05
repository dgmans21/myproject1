import { MOCK_RANKING } from "@/lib/mock-data";

/** 신뢰도 랭킹 상위 N명의 5점(인생맛집) → 장소 배지 */
export const TOP_TRUST_RANK_LIMIT = 10;

export interface TopRankerPlaceEndorsement {
  rank: number;
  user_id: string;
  display_name: string;
}

export function formatTopRankerEndorsement(e: TopRankerPlaceEndorsement): string {
  return `${e.rank}위 ${e.display_name}님이 추천한 맛집입니다`;
}

export function buildTrustRankIndex(): Map<
  string,
  { rank: number; display_name: string }
> {
  const sorted = [...MOCK_RANKING].sort(
    (a, b) =>
      b.trust_score - a.trust_score ||
      a.display_name.localeCompare(b.display_name, "ko")
  );
  const map = new Map<string, { rank: number; display_name: string }>();
  sorted.slice(0, TOP_TRUST_RANK_LIMIT).forEach((row, i) => {
    map.set(row.user_id, { rank: i + 1, display_name: row.display_name });
  });
  return map;
}

export function pickBestTopRankerEndorsement(
  ratings: Array<{ user_id: string; rating: number }>,
  rankIndex: Map<string, { rank: number; display_name: string }>
): TopRankerPlaceEndorsement | undefined {
  let best: TopRankerPlaceEndorsement | undefined;
  for (const row of ratings) {
    if (row.rating !== 5) continue;
    const info = rankIndex.get(row.user_id);
    if (!info) continue;
    if (!best || info.rank < best.rank) {
      best = {
        rank: info.rank,
        user_id: row.user_id,
        display_name: info.display_name,
      };
    }
  }
  return best;
}
