/** API 미연결 시 UI 미리보기용 목 데이터 */
export const MOCK_GROUPS = [
  {
    id: "demo-group-1",
    name: "주말 친구 모임",
    description: "매주 토요일 만나는 친구들",
    group_type: "formal",
    purpose: "정기 모임",
    member_count: 5,
    created_at: "2026-06-01T10:00:00Z",
  },
  {
    id: "demo-group-2",
    name: "이번 주 회식",
    description: "팀 회식 일정 조율",
    group_type: "ephemeral",
    purpose: "회식",
    member_count: 8,
    created_at: "2026-06-18T14:00:00Z",
  },
];

export const MOCK_APPOINTMENTS = [
  {
    id: "demo-apt-1",
    group_id: "demo-group-1",
    title: "6월 저녁 모임",
    description: "강남 근처에서 만나요",
    status: "date_voting",
    created_at: "2026-06-15T09:00:00Z",
  },
  {
    id: "demo-apt-2",
    group_id: "demo-group-1",
    title: "브런치 약속",
    status: "time_voting",
    created_at: "2026-06-10T09:00:00Z",
  },
  {
    id: "demo-apt-3",
    group_id: "demo-group-2",
    title: "팀 회식",
    description: "삼겹살 어때요?",
    status: "confirmed",
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
    tier: "gold",
    avg_rating: 4.3,
    rating_count: 12,
    recommender_title: "미식 가이드",
  },
  {
    id: "demo-place-2",
    name: "성수 브런치 카페",
    address: "서울 성동구 성수동",
    lat: 37.544,
    lng: 127.055,
    category: "카페",
    tier: "silver",
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
    tier: "platinum",
    avg_rating: 4.7,
    rating_count: 24,
    recommender_title: "gourmet 큐레이터",
  },
];
