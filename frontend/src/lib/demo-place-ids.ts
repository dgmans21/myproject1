/** DB 시드(004_demo_places.sql)와 mock 리뷰 키를 맞추는 고정 UUID */
export const DEMO_PLACE_IDS = {
  gangnam: "a0000001-0001-4000-8000-000000000001",
  seongsu: "a0000002-0002-4000-8000-000000000002",
  hongdae: "a0000003-0003-4000-8000-000000000003",
} as const;

export const DEMO_PLACE_ID_SET = new Set<string>(Object.values(DEMO_PLACE_IDS));
