/** 맛집 개인 별점 선택지 (0.5 단위). 4.5점만 월 5회 한도 — DB·API 동일 규칙 */
export const PLACE_RATING_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

export type PlaceRatingValue = (typeof PLACE_RATING_OPTIONS)[number];

export function formatPlaceRating(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
