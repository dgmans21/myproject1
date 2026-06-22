import {
  MOCK_APPOINTMENTS,
  MOCK_DATE_SUMMARY,
  MOCK_HEATMAP,
  MOCK_PLACES,
  MOCK_PROFILE,
  MOCK_RANKING,
  MOCK_ROOMS,
  MOCK_SETTLEMENT,
  MOCK_TIME_SUMMARY,
} from "./mock-data";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

const MAX_FIVE_STAR_TOTAL = 5;
const MAX_FOUR_HALF_PER_MONTH = 5;

function currentMonthYear() {
  return new Date().toISOString().slice(0, 7);
}

let mockRooms = [...MOCK_ROOMS] as Room[];
let mockAppointments = [...MOCK_APPOINTMENTS] as Appointment[];
let mockPlaces = [...MOCK_PLACES] as Place[];
let mockProfile = { ...MOCK_PROFILE } as Profile;
/** 유저별 장소 평점 (데모) */
let mockUserRatings: Record<string, number> = {};
let mockFourHalfUsed = 0;
let mockFourHalfMonth = currentMonthYear();

function syncFourHalfMonth() {
  const month = currentMonthYear();
  if (month !== mockFourHalfMonth) {
    mockFourHalfMonth = month;
    mockFourHalfUsed = 0;
  }
}

function recalcPlaceAvg(placeId: string, rating: number, isNew: boolean) {
  mockPlaces = mockPlaces.map((p) => {
    if (p.id !== placeId) return p;
    const count = isNew ? p.rating_count + 1 : p.rating_count;
    return {
      ...p,
      avg_rating: rating,
      rating_count: Math.max(count, 1),
      tier: rating >= 4.5 ? ("gold" as const) : rating >= 4 ? ("silver" as const) : p.tier,
    };
  });
}

function buildMockRatingQuota(): RatingQuota {
  syncFourHalfMonth();
  const fivePlaces: FiveStarPlaceItem[] = Object.entries(mockUserRatings)
    .filter(([, r]) => r === 5)
    .map(([placeId]) => {
      const p = mockPlaces.find((x) => x.id === placeId);
      return { place_id: placeId, place_name: p?.name ?? placeId };
    });
  return {
    five_star: { used: fivePlaces.length, max: MAX_FIVE_STAR_TOTAL, places: fivePlaces },
    four_half: {
      used: mockFourHalfUsed,
      max: MAX_FOUR_HALF_PER_MONTH,
      month_year: mockFourHalfMonth,
    },
  };
}

function applyMockRating(
  placeId: string,
  rating: number,
  replacePlaceId?: string
): void {
  syncFourHalfMonth();
  const oldRating = mockUserRatings[placeId];
  const isNew = oldRating === undefined;

  if (rating === 5 && oldRating !== 5) {
    const fiveCount = Object.entries(mockUserRatings).filter(
      ([id, r]) => r === 5 && id !== placeId
    ).length;
    if (fiveCount >= MAX_FIVE_STAR_TOTAL) {
      if (!replacePlaceId) {
        throw new Error(
          `5점은 최대 ${MAX_FIVE_STAR_TOTAL}곳까지 줄 수 있습니다. 다른 곳의 5점을 취소하고 주세요.`
        );
      }
      if (mockUserRatings[replacePlaceId] !== 5) {
        throw new Error("교체할 5점 평가를 찾을 수 없습니다");
      }
      mockUserRatings[replacePlaceId] = 4;
      recalcPlaceAvg(replacePlaceId, 4, false);
    }
  }

  if (rating === 4.5 && oldRating !== 4.5) {
    if (mockFourHalfUsed >= MAX_FOUR_HALF_PER_MONTH) {
      throw new Error(
        `이번 달 4.5점 평가 한도(${MAX_FOUR_HALF_PER_MONTH}회)를 초과했습니다`
      );
    }
    mockFourHalfUsed += 1;
  }

  mockUserRatings[placeId] = rating;
  recalcPlaceAvg(placeId, rating, isNew);
}

export const api = {
  profiles: {
    me: async () => {
      await delay();
      return mockProfile;
    },
    ratingQuota: async () => {
      await delay();
      return buildMockRatingQuota();
    },
    ranking: async (limit = 50) => {
      await delay();
      const sorted = [...MOCK_RANKING].sort((a, b) => b.trust_score - a.trust_score);
      return sorted.slice(0, limit).map((row, idx) => ({
        rank: idx + 1,
        user_id: row.user_id,
        display_name: row.display_name,
        trust_score: row.trust_score,
        residence: row.residence,
        selected_title: row.selected_title,
        badge_color: row.badge_color,
        badge_tier: row.badge_tier,
        is_me: row.user_id === mockProfile.id,
      }));
    },
    update: async (data: Partial<Profile>) => {
      await delay();
      mockProfile = { ...mockProfile, ...data };
      return mockProfile;
    },
    attendanceHeatmap: async () => {
      await delay();
      return MOCK_HEATMAP;
    },
    verifySecurity: async (_pin: string) => {
      await delay();
      return { verified: true };
    },
  },
  rooms: {
    list: async () => { await delay(); return mockRooms; },
    get: async (id: string) => {
      await delay();
      const r = mockRooms.find((x) => x.id === id);
      if (!r) throw new Error("방을 찾을 수 없습니다");
      return r;
    },
    create: async (data: RoomCreate) => {
      await delay();
      const room: Room = {
        id: `demo-room-${Date.now()}`,
        name: data.name,
        description: data.description,
        purpose: data.purpose,
        room_type: data.room_type || "ONE_TIME",
        room_status: "ACTIVE",
        member_count: 1,
        created_at: new Date().toISOString(),
      };
      mockRooms = [room, ...mockRooms];
      return room;
    },
    promote: async (id: string) => {
      await delay();
      mockRooms = mockRooms.map((r) =>
        r.id === id ? { ...r, room_type: "REGULAR" as const } : r
      );
      return mockRooms.find((r) => r.id === id)!;
    },
    delete: async (id: string) => {
      await delay();
      mockRooms = mockRooms.filter((r) => r.id !== id);
    },
  },
  appointments: {
    listByRoom: async (roomId: string) => {
      await delay();
      return mockAppointments.filter((a) => a.room_id === roomId);
    },
    create: async (data: AppointmentCreate) => {
      await delay();
      const apt: Appointment = {
        id: `demo-apt-${Date.now()}`,
        room_id: data.room_id,
        title: data.title,
        description: data.description,
        status: "date_voting",
        created_at: new Date().toISOString(),
      };
      mockAppointments = [apt, ...mockAppointments];
      return apt;
    },
    get: async (id: string) => {
      await delay();
      const apt = mockAppointments.find((a) => a.id === id);
      if (!apt) throw new Error("약속을 찾을 수 없습니다");
      return apt;
    },
    submitDateVote: async (_id: string, _data: DateVote) => { await delay(); return { ok: true }; },
    dateSummary: async (_id: string) => { await delay(); return MOCK_DATE_SUMMARY as VoteSummary[]; },
    advanceToTimeVote: async (id: string) => {
      await delay();
      mockAppointments = mockAppointments.map((a) =>
        a.id === id ? { ...a, status: "time_voting" as const } : a
      );
      return { status: "time_voting" };
    },
    submitTimeVote: async (_id: string, _data: TimeVote) => { await delay(); return { ok: true }; },
    timeSummary: async (_id: string) => { await delay(); return MOCK_TIME_SUMMARY as TimeSlotSummary[]; },
    confirm: async (id: string, voteDate: string, voteTime: string, placeId?: string) => {
      await delay();
      mockAppointments = mockAppointments.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "confirmed" as const,
              confirmed_date: voteDate,
              confirmed_time: voteTime,
              confirmed_place_id: placeId,
            }
          : a
      );
      return { status: "confirmed", date: voteDate, time: voteTime };
    },
    settlement: async (_id: string) => {
      await delay();
      return MOCK_SETTLEMENT as MeetingSettlement;
    },
  },
  places: {
    list: async (roomId?: string) => {
      await delay();
      return roomId ? mockPlaces : mockPlaces;
    },
    get: async (id: string) => {
      await delay();
      const p = mockPlaces.find((x) => x.id === id);
      if (!p) throw new Error("장소를 찾을 수 없습니다");
      return p;
    },
    create: async (data: PlaceCreate) => {
      await delay();
      const place: Place = {
        id: `demo-place-${Date.now()}`,
        name: data.name,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        category: data.category,
        tier: "bronze",
        avg_rating: 0,
        rating_count: 0,
      };
      mockPlaces = [place, ...mockPlaces];
      return place;
    },
    rate: async (
      id: string,
      data: { rating: number; replace_place_id?: string }
    ) => {
      await delay();
      applyMockRating(id, data.rating, data.replace_place_id);
      return { ok: true };
    },
    voteRecommendation: async (_id: string, _vote: "RECOMMEND" | "NOT_RECOMMEND") => {
      await delay();
      return { ok: true };
    },
    travelTime: async (req: TravelTimeRequest) => {
      await delay();
      return {
        duration_minutes: 25 + Math.floor(Math.random() * 20),
        distance_meters: 8500 + Math.floor(Math.random() * 5000),
        route_summary: `약 ${25 + Math.floor(Math.random() * 20)}분 · 데모 경로`,
      };
    },
  },
};

export interface RecommenderTitle {
  id: number;
  title: string;
  min_score: number;
  badge_color: string;
  border_style: string;
}

export interface Profile {
  id: string;
  display_name: string;
  age_group: "TEENS" | "TWENTIES" | "THIRTIES" | "FORTIES" | "FIFTIES_PLUS";
  residence: string;
  avatar_url?: string;
  home_address?: string;
  home_lat?: number;
  home_lng?: number;
  trust_score: number;
  badge_tier:
    | "NONE"
    | "BRONZE"
    | "SILVER"
    | "GOLD"
    | "PLATINUM"
    | "EMERALD"
    | "DIAMOND"
    | "MASTER"
    | "GRANDMASTER"
    | "SUPREME";
  role: "USER" | "ADMIN";
  selected_title_id?: number;
  selected_title?: string;
  places_adopted_count: number;
  available_titles?: RecommenderTitle[];
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  room_type: "ONE_TIME" | "REGULAR";
  room_status: "ACTIVE" | "ARCHIVED";
  purpose?: string;
  member_count: number;
  created_at: string;
}

export interface RoomCreate {
  name: string;
  description?: string;
  purpose?: string;
  room_type?: "ONE_TIME" | "REGULAR";
}

export interface TravelTimeRequest {
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  place_id?: string;
  appointment_id?: string;
}

export interface TravelTimeResponse {
  duration_minutes: number;
  distance_meters: number;
  route_summary: string;
}

export interface Appointment {
  id: string;
  room_id: string;
  title: string;
  description?: string;
  status: "draft" | "date_voting" | "time_voting" | "confirmed" | "cancelled";
  confirmed_date?: string;
  confirmed_time?: string;
  confirmed_place_id?: string;
  created_at: string;
}

export interface AppointmentCreate {
  room_id: string;
  title: string;
  description?: string;
}

export interface DateVote {
  vote_date: string;
  is_available: boolean;
}

export interface TimeVote {
  vote_date: string;
  vote_time: string;
  priority: number;
}

export interface VoteSummary {
  vote_date: string;
  available_count: number;
  total_members: number;
  availability_rate: number;
}

export interface TimeSlotSummary {
  vote_date: string;
  vote_time: string;
  vote_count: number;
  total_score: number;
}

export interface MeetingSettlement {
  sense_king_user_id?: string;
  sense_king_name?: string;
  sense_king_adopted_count: number;
  pro_traveler_user_id?: string;
  pro_traveler_name?: string;
  pro_travel_duration_minutes?: number;
  pro_travel_distance_meters?: number;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category?: string;
  kakao_place_id?: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  avg_rating: number;
  rating_count: number;
  recommender_title?: string;
  past_travel_hint?: string;
}

export interface FiveStarPlaceItem {
  place_id: string;
  place_name: string;
}

export interface RatingQuota {
  five_star: {
    used: number;
    max: number;
    places: FiveStarPlaceItem[];
  };
  four_half: {
    used: number;
    max: number;
    month_year: string;
  };
}

export interface RankingEntry {
  rank: number;
  user_id: string;
  display_name: string;
  trust_score: number;
  residence: string;
  selected_title?: string;
  badge_color?: string;
  badge_tier: Profile["badge_tier"];
  is_me: boolean;
}

export interface PlaceCreate {
  name: string;
  address: string;
  lat: number;
  lng: number;
  category?: string;
  room_id?: string;
}

export const TIER_LABELS: Record<string, string> = {
  bronze: "브론즈",
  silver: "실버",
  gold: "골드",
  platinum: "플래티넘",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "작성 중",
  date_voting: "1차 날짜 투표",
  time_voting: "2차 시간 투표",
  confirmed: "확정",
  cancelled: "취소",
};

export const ROOM_TYPE_LABELS: Record<string, string> = {
  ONE_TIME: "한 번 만나기",
  REGULAR: "정식 그룹",
};

export const ROOM_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "사용 중",
  ARCHIVED: "보관됨",
};
