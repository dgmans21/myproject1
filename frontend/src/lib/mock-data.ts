/** API 미연결 시 UI 미리보기용 목 데이터 (봇 시드 금지 — 데모용 최소 데이터만) */
import { SOCIAL_POINT_TITLES } from "./social-points";
export const MOCK_ROOMS = [
  {
    id: "demo-room-1",
    name: "주말 친구 모임",
    description: "매주 토요일 만나는 친구들",
    room_type: "REGULAR" as const,
    room_status: "ACTIVE" as const,
    is_fixed: true,
    is_sample: true,
    purpose: "정기 모임",
    member_count: 5,
    last_activity_at: "2026-06-20T10:00:00Z",
    created_at: "2026-06-01T10:00:00Z",
  },
  {
    id: "demo-room-2",
    name: "이번 주 회식",
    description: "팀 회식 일정 조율",
    room_type: "ONE_TIME" as const,
    room_status: "ACTIVE" as const,
    is_fixed: false,
    is_sample: true,
    expire_at: "2026-12-31T23:59:59Z",
    purpose: "회식",
    member_count: 8,
    last_activity_at: "2026-06-18T14:00:00Z",
    created_at: "2026-06-18T14:00:00Z",
  },
  {
    id: "demo-team-schedule-1",
    name: "프로젝트 팀 일정",
    description: "회의·업무 일정 공유",
    room_type: "TEAM_SCHEDULE" as const,
    room_status: "ACTIVE" as const,
    is_fixed: true,
    is_sample: true,
    purpose: "팀 일정",
    member_count: 3,
    last_activity_at: "2026-06-20T10:00:00Z",
    created_at: "2026-06-10T10:00:00Z",
    accent_color: "#6366F1",
  },
];

export const MOCK_ROOM_HEATMAP = [
  { activity_on: "2026-06-01", event_count: 1 },
  { activity_on: "2026-06-08", event_count: 2 },
  { activity_on: "2026-06-15", event_count: 1 },
  { activity_on: "2026-06-20", event_count: 3 },
];

export const MOCK_ROOM_MEMBERS = [
  {
    user_id: "demo-user",
    display_name: "데모 사용자",
    role: "OWNER",
    social_points: 420,
    social_title: "모임 요정",
    social_badge_color: "#2DD4BF",
    mbti_types: ["ENFP", "ENTP"],
    profile_decor: {
      chinese_zodiac: "MONKEY",
      western_zodiac: "GEMINI",
      blood_type: "A",
    },
    is_me: true,
  },
  {
    user_id: "demo-member-2",
    display_name: "친구 A",
    role: "MEMBER",
    social_points: 150,
    social_title: "약속 지킴이",
    social_badge_color: "#60A5FA",
    mbti_types: ["ISTJ"],
    profile_decor: {
      chinese_zodiac: "OX",
      western_zodiac: "CAPRICORN",
      blood_type: "B",
    },
    is_me: false,
  },
  {
    user_id: "demo-member-3",
    display_name: "친구 B",
    role: "MEMBER",
    social_points: 820,
    social_title: "인싸 새싹",
    social_badge_color: "#6366F1",
    mbti_types: ["INFP"],
    profile_decor: {
      chinese_zodiac: "DRAGON",
      western_zodiac: "PISCES",
      blood_type: "O",
    },
    is_me: false,
  },
];

/** 초대·친구 선택 UI용 (데모 계정 목록, 친구 API 연동 전) */
export const MOCK_FRIENDS = [
  { user_id: "demo-member-2", display_name: "친구 A" },
  { user_id: "demo-member-3", display_name: "친구 B" },
  { user_id: "demo-friend-4", display_name: "친구 C" },
  { user_id: "demo-friend-5", display_name: "친구 D" },
];

/** 초대 수락·비밀번호 입장 데모용 (내 방 목록에 없는 방) */
export const MOCK_DISCOVERABLE_ROOM = {
  id: "demo-room-invite-pending",
  name: "새로운 스터디 모임",
  description: "초대·비밀번호 입장 UI 테스트",
  room_type: "ONE_TIME" as const,
  room_status: "ACTIVE" as const,
  is_fixed: false,
  expire_at: "2026-12-31T23:59:59Z",
  purpose: "스터디",
  member_count: 3,
  last_activity_at: "2026-06-20T10:00:00Z",
  created_at: "2026-06-19T10:00:00Z",
  accent_color: "#818CF8",
};

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
    title: "강남역 불금 모임",
    description: "2차 투표로 확정된 장소에서 만나요",
    status: "confirmed" as const,
    confirmed_date: "2026-06-22",
    confirmed_time: "19:00:00",
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
    name: "강남역 한우곱창",
    address: "서울 강남구 강남대로 396 (강남역 인근)",
    lat: 37.4979,
    lng: 127.0276,
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

/** 장소별 공개 리뷰 시드 (mock — 실API: place_ratings ⋈ profiles) */
export const MOCK_PLACE_REVIEWS: Record<
  string,
  Array<{
    user_id: string;
    display_name: string;
    rating: number;
    review: string;
    created_at: string;
    mbti_types?: string[];
    profile_decor?: {
      chinese_zodiac?: string;
      western_zodiac?: string;
      blood_type?: string;
    };
  }>
> = {
  "demo-place-1": [
    {
      user_id: "demo-member-2",
      display_name: "친구 A",
      rating: 4.5,
      review: "곱창 양념이 깔끔하고 대기 줄 대비 회전 빨라요. 단체 모임 추천",
      created_at: "2026-06-10T12:00:00Z",
      mbti_types: ["ISTJ"],
      profile_decor: { chinese_zodiac: "OX", western_zodiac: "CAPRICORN", blood_type: "B" },
    },
    {
      user_id: "demo-rank-2",
      display_name: "미식탐험가",
      rating: 4,
      review: "점심보다 저녁이 더 맛있음. 강남역에서 걸어 5분",
      created_at: "2026-06-05T18:30:00Z",
    },
    {
      user_id: "demo-member-3",
      display_name: "친구 B",
      rating: 5,
      review: "회식하기 딱 좋은 분위기! 직원분들도 친절해요",
      created_at: "2026-06-01T20:00:00Z",
      mbti_types: ["INFP"],
      profile_decor: { chinese_zodiac: "DRAGON", western_zodiac: "PISCES", blood_type: "O" },
    },
  ],
  "demo-place-2": [
    {
      user_id: "demo-rank-3",
      display_name: "한식마스터",
      rating: 4,
      review: "브런치 플레이트 구성 알차고 커피도 괜찮아요",
      created_at: "2026-06-08T11:00:00Z",
    },
    {
      user_id: "demo-user",
      display_name: "데모 사용자",
      rating: 3.5,
      review: "주말엔 사람 많아서 예약 필수",
      created_at: "2026-06-12T09:15:00Z",
      mbti_types: ["ENFP", "ENTP"],
      profile_decor: { chinese_zodiac: "MONKEY", western_zodiac: "GEMINI", blood_type: "A" },
    },
  ],
  "demo-place-3": [
    {
      user_id: "demo-rank-1",
      display_name: "골드맛집러",
      rating: 5,
      review: "사케 종류 많고 안주가 전부 히트. 홍대 모임 1순위",
      created_at: "2026-06-15T21:00:00Z",
    },
    {
      user_id: "demo-member-2",
      display_name: "친구 A",
      rating: 4.5,
      review: "혼잡하지만 회전 빠름. 치킨 가라아게 강추",
      created_at: "2026-06-14T19:45:00Z",
      mbti_types: ["ISTJ"],
    },
  ],
};

/** recommender_titles 시드와 동일 (데모·타입 참조용) */
export const RECOMMENDER_TITLES = [
  { id: 1, title: "신입 탐험가", min_score: 0, badge_color: "#94A3B8", border_style: "none" },
  { id: 2, title: "맛집 발굴단", min_score: 10, badge_color: "#60A5FA", border_style: "bronze" },
  { id: 3, title: "미식 가이드", min_score: 50, badge_color: "#34D399", border_style: "silver" },
  { id: 4, title: "gourmet 큐레이터", min_score: 150, badge_color: "#FBBF24", border_style: "gold" },
  { id: 5, title: "밥구르망", min_score: 300, badge_color: "#2563EB", border_style: "platinum" },
  { id: 6, title: "밥슐령가이드", min_score: 500, badge_color: "#10B981", border_style: "emerald" },
  { id: 7, title: "다이아 방구석쓰리스타", min_score: 750, badge_color: "#06B6D4", border_style: "diamond" },
  { id: 8, title: "마스터 한국의 미식家", min_score: 1000, badge_color: "#1E40AF", border_style: "master" },
  { id: 9, title: "전설의 미식왕 그랜드마스터", min_score: 2000, badge_color: "#B45309", border_style: "grandmaster" },
  { id: 10, title: "명예 미슐랭 가이드", min_score: 3000, badge_color: "#FFD54F", border_style: "supreme" },
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
  social_points: 420,
  badge_tier: "SILVER" as const,
  role: "USER" as const,
  selected_title_id: 3,
  selected_title: "미식 가이드",
  selected_social_title_id: 4,
  selected_social_title: "모임 요정",
  mbti_types: ["ENFP", "ENTP"],
  profile_decor: {
    chinese_zodiac: "MONKEY" as const,
    western_zodiac: "GEMINI" as const,
    blood_type: "A" as const,
    accent_color: "#818CF8",
    theme_preset: "ocean" as const,
    interest_emojis: ["⚽", "🎮"],
  },
  places_adopted_count: 4,
  available_titles: RECOMMENDER_TITLES.filter((t) => t.min_score <= 35),
  available_social_titles: SOCIAL_POINT_TITLES.filter((t) => t.min_points <= 420),
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
  pro_traveler_user_id: "demo-member-3",
  pro_traveler_name: "친구 B",
  pro_travel_duration_minutes: 62,
  pro_travel_distance_meters: 28500,
};

/** 브리핑 mock: 멤버별 출발지 라벨·좌표·확정 시 기록된 이동시간(분) */
export const MOCK_MEMBER_BRIEFING = {
  "demo-user": { origin_label: "홍대입구", lat: 37.557527, lng: 126.9245, duration_minutes: 35 },
  "demo-member-2": { origin_label: "수원시청", lat: 37.263572, lng: 127.0286, duration_minutes: 48 },
  "demo-member-3": { origin_label: "인천터미널", lat: 37.4482, lng: 126.6535, duration_minutes: 62 },
} as const;

/** 팀 일정방 — 날짜별 메모 (mock) */
export const MOCK_TEAM_SCHEDULE_DAY_MEMOS = [
  {
    id: "tsm-1",
    room_id: "demo-team-schedule-1",
    user_id: "demo-user",
    display_name: "데모 사용자",
    schedule_date: "2026-06-23",
    memo: "오후 2시 스프린트 회의, 배포 전 QA 필요",
    updated_at: "2026-06-20T09:00:00Z",
  },
  {
    id: "tsm-2",
    room_id: "demo-team-schedule-1",
    user_id: "demo-member-2",
    display_name: "친구 A",
    schedule_date: "2026-06-23",
    memo: "오전은 외근, 14시 이후 가능",
    updated_at: "2026-06-20T10:30:00Z",
  },
  {
    id: "tsm-3",
    room_id: "demo-team-schedule-1",
    user_id: "demo-member-3",
    display_name: "친구 B",
    schedule_date: "2026-06-25",
    memo: "디자인 리뷰 + 저녁 스탠드업",
    updated_at: "2026-06-19T15:00:00Z",
  },
  {
    id: "tsm-4",
    room_id: "demo-team-schedule-1",
    user_id: "demo-user",
    display_name: "데모 사용자",
    schedule_date: "2026-06-27",
    memo: "주말 배포 대기 (온콜)",
    updated_at: "2026-06-18T11:00:00Z",
  },
];

export const MOCK_BRIEFING_COMMENTS = [
  {
    id: "bc-1",
    user_id: "demo-user",
    display_name: "데모 사용자",
    body: "나 지금 신도림역 지나는 중! 생각보다 차 안 막히네",
    created_at: "2026-06-22T18:10:00+09:00",
    is_me: true,
  },
  {
    id: "bc-2",
    user_id: "demo-member-2",
    display_name: "친구 A",
    body: "퇴근이 좀 늦음 ㅠㅠ 15분 정도 늦을 것 같아 미안!",
    created_at: "2026-06-22T18:15:00+09:00",
    is_me: false,
  },
];
