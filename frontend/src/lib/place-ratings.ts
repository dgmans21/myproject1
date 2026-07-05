/** 맛집 개인 별점 선택지 (0.5 단위). 4.5점만 월 5회 한도 — DB·API 동일 규칙 */
export const PLACE_RATING_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

export type PlaceRatingValue = (typeof PLACE_RATING_OPTIONS)[number];

export const PREMIUM_RATING_META = {
  4.5: {
    label: "나만의 맛집",
    shortLabel: "나만의",
    quotaHint: "월 5회 · 변경 시 환불",
  },
  5: {
    label: "인생맛집",
    shortLabel: "인생",
    quotaHint: "평생 5곳 · 변경 가능",
  },
} as const;

export function formatPlaceRating(value: number): string {
  if (value === 4.5) return PREMIUM_RATING_META[4.5].label;
  if (value === 5) return PREMIUM_RATING_META[5].label;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function isPremiumRating(value: number): value is 4.5 | 5 {
  return value === 4.5 || value === 5;
}
