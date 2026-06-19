// import { createClient } from "@/lib/supabase/client";
import {
  MOCK_APPOINTMENTS,
  MOCK_DATE_SUMMARY,
  MOCK_GROUPS,
  MOCK_PLACES,
  MOCK_TIME_SUMMARY,
} from "./mock-data";

// const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- API 미연결: UI 미리보기 모드 (목 데이터 사용) ---
// API 연동 시 아래 mock 구현을 제거하고 하단 주석 처리된 실제 API 코드를 복원하세요.

let mockGroups = [...MOCK_GROUPS] as Group[];
let mockAppointments = [...MOCK_APPOINTMENTS] as Appointment[];
let mockPlaces = [...MOCK_PLACES] as Place[];

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// async function getAuthHeaders(): Promise<HeadersInit> {
//   const supabase = createClient();
//   const { data: { session } } = await supabase.auth.getSession();
//   const headers: HeadersInit = { "Content-Type": "application/json" };
//   if (session?.access_token) {
//     headers["Authorization"] = `Bearer ${session.access_token}`;
//   }
//   return headers;
// }

// async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
//   const headers = await getAuthHeaders();
//   const res = await fetch(`${API_BASE}${path}`, {
//     ...options,
//     headers: { ...headers, ...options.headers },
//   });
//   if (!res.ok) {
//     const err = await res.json().catch(() => ({ detail: res.statusText }));
//     throw new Error(err.detail || "API 요청 실패");
//   }
//   if (res.status === 204) return undefined as T;
//   return res.json();
// }

export const api = {
  profiles: {
    me: async () => {
      await delay();
      return {
        id: "demo-user",
        display_name: "데모 사용자",
        recommender_title: "맛집 발굴단",
        recommender_score: 80,
      };
    },
    update: async (data: Partial<Profile>) => {
      await delay();
      return { id: "demo-user", display_name: "데모 사용자", recommender_title: "맛집 발굴단", recommender_score: 80, ...data };
    },
  },
  groups: {
    list: async () => { await delay(); return mockGroups; },
    get: async (id: string) => {
      await delay();
      const g = mockGroups.find((x) => x.id === id);
      if (!g) throw new Error("그룹을 찾을 수 없습니다");
      return g;
    },
    create: async (data: GroupCreate) => {
      await delay();
      const group: Group = {
        id: `demo-group-${Date.now()}`,
        name: data.name,
        description: data.description,
        purpose: data.purpose,
        group_type: data.group_type || "ephemeral",
        member_count: 1,
        created_at: new Date().toISOString(),
      };
      mockGroups = [group, ...mockGroups];
      return group;
    },
    promote: async (id: string) => {
      await delay();
      mockGroups = mockGroups.map((g) =>
        g.id === id ? { ...g, group_type: "formal" as const } : g
      );
      return mockGroups.find((g) => g.id === id)!;
    },
    delete: async (id: string) => {
      await delay();
      mockGroups = mockGroups.filter((g) => g.id !== id);
    },
  },
  appointments: {
    listByGroup: async (groupId: string) => {
      await delay();
      return mockAppointments.filter((a) => a.group_id === groupId);
    },
    create: async (data: AppointmentCreate) => {
      await delay();
      const apt: Appointment = {
        id: `demo-apt-${Date.now()}`,
        group_id: data.group_id,
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
  },
  places: {
    list: async (_groupId?: string) => { await delay(); return mockPlaces; },
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
    travelTime: async () => {
      await delay();
      return { duration_minutes: 25, distance_meters: 8500, route_summary: "약 25분 · 8.5km (데모)" };
    },
  },
};

// --- 실제 API 연동 코드 (현재 주석 처리) ---
// export const api = {
//   profiles: {
//     me: () => request<Profile>("/api/v1/profiles/me"),
//     update: (data: Partial<Profile>) =>
//       request<Profile>("/api/v1/profiles/me", { method: "PATCH", body: JSON.stringify(data) }),
//   },
//   groups: {
//     list: () => request<Group[]>("/api/v1/groups"),
//     get: (id: string) => request<Group>(`/api/v1/groups/${id}`),
//     create: (data: GroupCreate) =>
//       request<Group>("/api/v1/groups", { method: "POST", body: JSON.stringify(data) }),
//     promote: (id: string) =>
//       request<Group>(`/api/v1/groups/${id}/promote`, { method: "POST" }),
//     delete: (id: string) =>
//       request<void>(`/api/v1/groups/${id}`, { method: "DELETE" }),
//   },
//   appointments: { ... },
//   places: { ... },
// };

export interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
  home_address?: string;
  home_lat?: number;
  home_lng?: number;
  recommender_title: string;
  recommender_score: number;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  group_type: "ephemeral" | "formal";
  purpose?: string;
  member_count: number;
  created_at: string;
}

export interface GroupCreate {
  name: string;
  description?: string;
  purpose?: string;
  group_type?: "ephemeral" | "formal";
}

export interface Appointment {
  id: string;
  group_id: string;
  title: string;
  description?: string;
  status: "draft" | "date_voting" | "time_voting" | "confirmed" | "cancelled";
  confirmed_date?: string;
  confirmed_time?: string;
  created_at: string;
}

export interface AppointmentCreate {
  group_id: string;
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
}

export interface PlaceCreate {
  name: string;
  address: string;
  lat: number;
  lng: number;
  category?: string;
  group_id?: string;
}

export interface TravelTimeRequest {
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
}

export interface TravelTimeResponse {
  duration_minutes: number;
  distance_meters: number;
  route_summary: string;
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
