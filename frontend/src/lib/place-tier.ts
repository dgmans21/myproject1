/** 맛집 등급 — avg_rating 구간 · 소셜 칭호 badge_color 재사용 */

export const PLACE_TIER_IDS = [
  "unrated",
  "bronze",
  "silver",
  "gold",
  "platinum_shiny",
  "emerald_shiny",
  "diamond_shiny",
  "master_blue",
  "grandmaster_crimson_vermilion",
  "vip_white_gold",
] as const;

export type PlaceTierId = (typeof PLACE_TIER_IDS)[number];

/** 평균 평점 하한(포함) → tier. 백엔드 calc_tier와 동일 순서 */
export const PLACE_TIER_MIN_AVG: readonly { min: number; tier: PlaceTierId }[] = [
  { min: 4.5, tier: "vip_white_gold" },
  { min: 4.25, tier: "grandmaster_crimson_vermilion" },
  { min: 4.0, tier: "master_blue" },
  { min: 3.75, tier: "diamond_shiny" },
  { min: 3.5, tier: "emerald_shiny" },
  { min: 3.0, tier: "platinum_shiny" },
  { min: 2.5, tier: "gold" },
  { min: 2.0, tier: "silver" },
  { min: 1.0, tier: "bronze" },
];

export const PLACE_TIER_META: Record<
  PlaceTierId,
  { label: string; badgeColor: string; ringClass: string }
> = {
  unrated: { label: "미평가", badgeColor: "#94A3B8", ringClass: "tier-unrated" },
  bronze: { label: "브론즈", badgeColor: "#CD7F32", ringClass: "tier-bronze" },
  silver: { label: "실버", badgeColor: "#C0C0C0", ringClass: "tier-silver" },
  gold: { label: "골드", badgeColor: "#DAA520", ringClass: "tier-gold" },
  platinum_shiny: { label: "플래티넘", badgeColor: "#E5E4E2", ringClass: "tier-platinum_shiny" },
  emerald_shiny: { label: "에메랄드", badgeColor: "#50C878", ringClass: "tier-emerald_shiny" },
  diamond_shiny: { label: "다이아", badgeColor: "#B9F2FF", ringClass: "tier-diamond_shiny" },
  master_blue: { label: "마스터", badgeColor: "#2563EB", ringClass: "tier-master_blue" },
  grandmaster_crimson_vermilion: {
    label: "그랜드마스터",
    badgeColor: "#800020",
    ringClass: "tier-grandmaster_crimson_vermilion",
  },
  vip_white_gold: { label: "VIP", badgeColor: "#FDE047", ringClass: "tier-vip_white_gold" },
};

/** 구 enum platinum 등 — 표시용 fallback */
const LEGACY_TIER_ALIASES: Record<string, PlaceTierId> = {
  platinum: "platinum_shiny",
};

export function normalizePlaceTier(tier: string): PlaceTierId {
  const key = tier as PlaceTierId;
  if (PLACE_TIER_META[key]) return key;
  return LEGACY_TIER_ALIASES[tier] ?? "unrated";
}

export function calcPlaceTierFromAvg(avgRating: number, ratingCount: number): PlaceTierId {
  if (ratingCount <= 0 || avgRating < 1.0) return "unrated";
  for (const band of PLACE_TIER_MIN_AVG) {
    if (avgRating >= band.min) return band.tier;
  }
  return "unrated";
}

export function getPlaceTierLabel(tier: string): string {
  return PLACE_TIER_META[normalizePlaceTier(tier)].label;
}

export function getPlaceTierRingClass(tier: string): string {
  return PLACE_TIER_META[normalizePlaceTier(tier)].ringClass;
}

export const TIER_LABELS: Record<string, string> = Object.fromEntries(
  PLACE_TIER_IDS.map((id) => [id, PLACE_TIER_META[id].label])
);

TIER_LABELS.platinum = PLACE_TIER_META.platinum_shiny.label;
