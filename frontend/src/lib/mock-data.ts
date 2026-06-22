/** API 미연결 시 UI 미리보기용 목 데이터 (봇 시드 금지 — 데모용 최소 데이터만) */
export const MOCK_ROOMS = [
  {
    id: "demo-room-1",
    name: "주말 친구 모임",
    description: "매주 토요일 만나는 친구들",
    room_type: "REGULAR" as const,
    room_status: "ACTIVE" as const,
    purpose: "정기 모임",
    member_count: 5,
    created_at: "2026-06-01T10:00:00Z",
  },
  {
    id: "demo-room-2",
    name: "이번 주 회식",
    description: "팀 회식 일정 조율",
    room_type: "ONE_TIME" as const,
    room_status: "ACTIVE" as const,
    purpose: "회식",
    member_count: 8,
    created_at: "2026-06-18T14:00:00Z",
  },
];

export const MOCK_APPOINTMENTS = [
  {
    id: "demo-apt-1",
    room_id: "demo-room-1",
    title: "6월 저녁 모임",
    description: "강남 근처에서 만나요",
    status: "date_voting" as const,
    created_at: "2026-06-15T09:00:00Z",
  },
  {
    id: "demo-apt-2",
    room_id: "demo-room-1",
    title: "브런치 약속",
    status: "time_voting" as const,
    created_at: "2026-06-10T09:00:00Z",
  },
  {
    id: "demo-apt-3",
    room_id: "demo-room-2",
    title: "팀 회식",
    description: "삼겹살 어때요?",
    status: "confirmed" as const,
    confirmed_date: "2026-06-28",
    confirmed_time: "18:00:00",
    confirmed_place_id: "demo-place-1",
    created_at: "2026-06-12T09:00:00Z",
  },
];

export const MOCK_DATE_SUMMARY = [
  { vote_date: "2026-06-21", available_count: 5, total_members: 5, availability_rate: 100 },
  { vote_date: "2026-06-22", available_count: 4, total_members: 5, availability_rate: 80 },
  { vote_date: "2026-06-28", available_count: 3, total_members: 5, availability_rate: 60 },
];

export const MOCK_TIME_SUMMARY = [
  { vote_date: "2026-06-21", vote_time: "18:00:00", vote_count: 4, total_score: 10 },
  { vote_date: "2026-06-21", vote_time: "19:00:00", vote_count: 3, total_score: 7 },
  { vote_date: "2026-06-22", vote_time: "12:00:00", vote_count: 3, total_score: 8 },
];

export const MOCK_PLACES = [
  {
    id: "demo-place-1",
    name: "을지로 골목식당",
    address: "서울 중구 을지로3가",
    lat: 37.5665,
    lng: 126.991,
    category: "한식",
    tier: "gold" as const,
    avg_rating: 4.3,
    rating_count: 12,
    recommender_title: "미식 가이드",
    past_travel_hint: "지난에 모였을 때 약 32분 걸렸어요",
  },
  {
    id: "demo-place-2",
    name: "성수 브런치 카페",
    address: "서울 성동구 성수동",
    lat: 37.544,
    lng: 127.055,
    category: "카페",
    tier: "silver" as const,
    avg_rating: 4.0,
    rating_count: 7,
    recommender_title: "맛집 발굴단",
  },
  {
    id: "demo-place-3",
    name: "홍대 이자카야",
    address: "서울 마포구 홍익로",
    lat: 37.556,
    lng: 126.923,
    category: "일식",
    tier: "platinum" as const,
    avg_rating: 4.7,
    rating_count: 24,
    recommender_title: "gourmet 큐레이터",
    past_travel_hint: "지난에 모였을 때 약 48분 걸렸어요",
  },
];

/** recommender_titles 시드와 동일 (데모·타입 참조용) */
export const RECOMMENDER_TITLES = [
  { id: 1, title: "신입 탐험가", min_score: 0, badge_color: "#94A3B8", border_style: "none" },
  { id: 2, title: "맛집 발굴단", min_score: 10, badge_color: "#60A5FA", border_style: "bronze" },
  { id: 3, title: "미식 가이드", min_score: 50, badge_color: "#34D399", border_style: "silver" },
  { id: 4, title: "gourmet 큐레이터", min_score: 150, badge_color: "#FBBF24", border_style: "gold" },
  { id: 5, title: "밥구르망", min_score: 300, badge_color: "#2563EB", border_style: "platinum" },
  { id: 6, title: "밥슐령가이드", min_score: 500, badge_color: "#10B981", border_style: "emerald" },
  { id: 7, title: "다이아 방구석쓰리스타", min_score: 700, badge_color: "#06B6D4", border_style: "diamond" },
  { id: 8, title: "마스터 한국의 미식家", min_score: 1000, badge_color: "#1E40AF", border_style: "korean_michelin" },
  { id: 9, title: "전설의 미식왕 그랜드마스터", min_score: 1500, badge_color: "#B45309", border_style: "korean_michelin" },
  { id: 10, title: "명예 미슐랭 가이드", min_score: 2000, badge_color: "#FFD54F", border_style: "korean_michelin" },
] as const;

export const MOCK_RANKING = [
  {
    user_id: "demo-rank-1",
    display_name: "골드맛집러",
    trust_score: 2280,
    residence: "서울 강남구",
    selected_title: "명예 미슐랭 가이드",
    badge_color: "#FFD54F",
    badge_tier: "SUPREME" as const,
  },
  {
    user_id: "demo-rank-2",
    display_name: "미식탐험가",
    trust_score: 1620,
    residence: "경기 성남시",
    selected_title: "전설의 미식왕 그랜드마스터",
    badge_color: "#B45309",
    badge_tier: "GRANDMASTER" as const,
  },
  {
    user_id: "demo-rank-3",
    display_name: "한식마스터",
    trust_score: 1180,
    residence: "서울 마포구",
    selected_title: "마스터 한국의 미식家",
    badge_color: "#1E40AF",
    badge_tier: "MASTER" as const,
  },
  {
    user_id: "demo-user",
    display_name: "데모 사용자",
    trust_score: 35,
    residence: "서울 강남구",
    selected_title: "미식 가이드",
    badge_color: "#34D399",
    badge_tier: "SILVER" as const,
  },
  {
    user_id: "demo-rank-5",
    display_name: "방구석평론가",
    trust_score: 720,
    residence: "인천 연수구",
    selected_title: "다이아 방구석쓰리스타",
    badge_color: "#06B6D4",
    badge_tier: "DIAMOND" as const,
  },
  {
    user_id: "demo-rank-6",
    display_name: "밥슐령지도",
    trust_score: 540,
    residence: "서울 송파구",
    selected_title: "밥슐령가이드",
    badge_color: "#10B981",
    badge_tier: "EMERALD" as const,
  },
  {
    user_id: "demo-rank-7",
    display_name: "밥구르망팬",
    trust_score: 310,
    residence: "부산 해운대구",
    selected_title: "밥구르망",
    badge_color: "#2563EB",
    badge_tier: "PLATINUM" as const,
  },
  {
    user_id: "demo-rank-8",
    display_name: "큐레이터J",
    trust_score: 165,
    residence: "대구 수성구",
    selected_title: "gourmet 큐레이터",
    badge_color: "#FBBF24",
    badge_tier: "GOLD" as const,
  },
];

export const MOCK_PROFILE = {
  id: "demo-user",
  display_name: "데모 사용자",
  age_group: "TWENTIES" as const,
  residence: "서울 강남구",
  home_lat: 37.4979,
  home_lng: 127.0276,
  trust_score: 35,
  badge_tier: "SILVER" as const,
  role: "USER" as const,
  selected_title_id: 3,
  selected_title: "미식 가이드",
  places_adopted_count: 4,
  available_titles: RECOMMENDER_TITLES.filter((t) => t.min_score <= 35),
};

export const MOCK_HEATMAP = [
  { date: "2026-06-01", count: 1 },
  { date: "2026-06-08", count: 1 },
  { date: "2026-06-15", count: 2 },
  { date: "2026-06-20", count: 1 },
];

export const MOCK_SETTLEMENT = {
  sense_king_user_id: "demo-user",
  sense_king_name: "데모 사용자",
  sense_king_adopted_count: 4,
  pro_traveler_user_id: "demo-user-2",
  pro_traveler_name: "멀리서 온 친구",
  pro_travel_duration_minutes: 52,
  pro_travel_distance_meters: 18500,
};
