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
    past_travel_hint: "지난 모임 기준 약 32분 소요",
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
    past_travel_hint: "지난 모임 기준 약 48분 소요",
  },
];

export const MOCK_PROFILE = {
  id: "demo-user",
  display_name: "데모 사용자",
  age_group: "TWENTIES" as const,
  residence: "서울 강남구",
  trust_score: 35,
  badge_tier: "SILVER" as const,
  role: "USER" as const,
  selected_title_id: 3,
  selected_title: "미식 가이드",
  places_adopted_count: 4,
  available_titles: [
    { id: 1, title: "신입 탐험가", min_score: 0, badge_color: "#94A3B8", border_style: "none" },
    { id: 2, title: "맛집 발굴단", min_score: 10, badge_color: "#60A5FA", border_style: "bronze" },
    { id: 3, title: "미식 가이드", min_score: 30, badge_color: "#34D399", border_style: "silver" },
  ],
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
