import {
  MOCK_APPOINTMENTS,
  MOCK_DATE_SUMMARY,
  MOCK_HEATMAP,
  MOCK_PLACES,
  MOCK_PROFILE,
  MOCK_ROOMS,
  MOCK_SETTLEMENT,
  MOCK_TIME_SUMMARY,
} from "./mock-data";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

let mockRooms = [...MOCK_ROOMS] as Room[];
let mockAppointments = [...MOCK_APPOINTMENTS] as Appointment[];
let mockPlaces = [...MOCK_PLACES] as Place[];
let mockProfile = { ...MOCK_PROFILE } as Profile;

export const api = {
  profiles: {
    me: async () => {
      await delay();
      return mockProfile;
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
    confirm: async (id: string, voteDate: string, voteTime: string) => {
      await delay();
      mockAppointments = mockAppointments.map((a) =>
        a.id === id
          ? { ...a, status: "confirmed" as const, confirmed_date: voteDate, confirmed_time: voteTime }
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
    list: async (_roomId?: string) => { await delay(); return mockPlaces; },
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
    rate: async (id: string, data: { rating: number }) => {
      await delay();
      if (data.rating === 5) {
        // 데모: 5점 제한 안내 (ADMIN은 서버에서 bypass)
      }
      mockPlaces = mockPlaces.map((p) =>
        p.id === id
          ? {
              ...p,
              avg_rating: data.rating,
              rating_count: p.rating_count + 1,
              tier: data.rating >= 4.5 ? "gold" as const : p.tier,
            }
          : p
      );
      return { ok: true };
    },
    voteRecommendation: async (_id: string, _vote: "RECOMMEND" | "NOT_RECOMMEND") => {
      await delay();
      return { ok: true };
    },
    travelTime: async () => {
      await delay();
      return { duration_minutes: 25, distance_meters: 8500, route_summary: "약 25분 · 8.5km (데모)" };
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
  badge_tier: "NONE" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
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

export interface Appointment {
  id: string;
  room_id: string;
  title: string;
  description?: string;
  status: "draft" | "date_voting" | "time_voting" | "confirmed" | "cancelled";
  confirmed_date?: string;
  confirmed_time?: string;
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
  tier: "bronze" | "silver" | "gold" | "platinum";
  avg_rating: number;
  rating_count: number;
  recommender_title?: string;
  past_travel_hint?: string;
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
  ONE_TIME: "일회성 방",
  REGULAR: "정식 그룹",
};
