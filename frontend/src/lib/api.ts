import {
  MOCK_APPOINTMENTS,
  MOCK_BRIEFING_COMMENTS,
  MOCK_DATE_SUMMARY,
  MOCK_HEATMAP,
  MOCK_MEMBER_BRIEFING,
  MOCK_PLACES,
  MOCK_PROFILE,
  MOCK_RANKING,
  MOCK_ROOM_HEATMAP,
  MOCK_ROOM_MEMBERS,
  MOCK_ROOMS,
  MOCK_SETTLEMENT,
  MOCK_TIME_SUMMARY,
} from "./mock-data";
import {
  isMeetingEnded,
  minutesUntilAppointment,
  punctualityStatus,
} from "./appointment-time";
import { SOCIAL_POINT_TITLES } from "./social-points";

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
/** praise votes: key `${roomId}:${aptId}:${voterId}` -> targetUserId */
let mockPraiseVotes: Record<string, Record<string, string>> = {};
let mockTravelRewards: Record<string, string> = {};
let mockMemberPoints: Record<string, number> = {
  "demo-user": 420,
  "demo-member-2": 150,
  "demo-member-3": 820,
};
let mockBriefingComments: Record<string, AppointmentComment[]> = {
  "demo-apt-3": MOCK_BRIEFING_COMMENTS.map((c) => ({ ...c })),
};
let mockDepartureStatus: Record<string, Record<string, DepartureStatus>> = {
  "demo-apt-3": {
    "demo-user": "NOT_DEPARTED",
    "demo-member-2": "EN_ROUTE",
    "demo-member-3": "NOT_DEPARTED",
  },
};
let mockConfirmTravel: Record<
  string,
  Record<string, { duration_minutes: number; distance_meters: number }>
> = {
  "demo-apt-3": Object.fromEntries(
    Object.entries(MOCK_MEMBER_BRIEFING).map(([uid, v]) => [
      uid,
      { duration_minutes: v.duration_minutes, distance_meters: v.duration_minutes * 420 },
    ])
  ),
};

function localDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 데모 브리핑 약속: 항상 '오늘(또는 내일) 19:00'으로 맞춰 입력 UI를 테스트 가능하게 */
function refreshDemoBriefingAppointment() {
  const apt = mockAppointments.find((a) => a.id === "demo-apt-3");
  if (!apt || apt.status !== "confirmed") return;

  const now = new Date();
  let meeting = new Date(now);
  meeting.setHours(19, 0, 0, 0);
  const end = new Date(meeting.getTime() + 3 * 60 * 60 * 1000);
  if (now >= end) {
    meeting.setDate(meeting.getDate() + 1);
  }
  apt.confirmed_date = localDateStr(meeting);
  apt.confirmed_time = "19:00:00";
}

function seedConfirmTravelLogs(appointmentId: string) {
  mockConfirmTravel[appointmentId] = Object.fromEntries(
    Object.entries(MOCK_MEMBER_BRIEFING).map(([uid, v]) => [
      uid,
      { duration_minutes: v.duration_minutes, distance_meters: v.duration_minutes * 420 },
    ])
  );
}

function buildMockBriefing(appointmentId: string): AppointmentBriefing {
  if (appointmentId === "demo-apt-3") refreshDemoBriefingAppointment();
  const apt = mockAppointments.find((a) => a.id === appointmentId);
  if (!apt?.confirmed_date || !apt.confirmed_time) {
    throw new Error("확정된 약속만 브리핑을 조회할 수 있습니다");
  }
  const place = mockPlaces.find((p) => p.id === apt.confirmed_place_id);
  const travel = mockConfirmTravel[appointmentId] ?? {};
  const departures = mockDepartureStatus[appointmentId] ?? {};

  const members: MemberBriefingStatus[] = MOCK_ROOM_MEMBERS.map((m) => {
    const origin = MOCK_MEMBER_BRIEFING[m.user_id as keyof typeof MOCK_MEMBER_BRIEFING];
    const dep = departures[m.user_id] ?? "NOT_DEPARTED";
    const duration = travel[m.user_id]?.duration_minutes ?? origin?.duration_minutes;
    const departed = dep === "EN_ROUTE";
    let estimated_arrival: string | undefined;
    if (departed && duration != null) {
      const eta = new Date(Date.now() + duration * 60000);
      estimated_arrival = eta.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    return {
      user_id: m.user_id,
      display_name: m.display_name,
      origin_label: origin?.origin_label ?? "출발지 미등록",
      duration_minutes: duration,
      distance_meters: travel[m.user_id]?.distance_meters,
      estimated_arrival,
      punctuality: punctualityStatus(apt.confirmed_date!, apt.confirmed_time!, duration ?? 0, departed),
      departure_status: dep,
      is_me: m.is_me,
    };
  });

  return {
    appointment_id: appointmentId,
    title: apt.title,
    confirmed_date: apt.confirmed_date,
    confirmed_time: apt.confirmed_time,
    place_name: place?.name ?? "",
    place_address: place?.address ?? "",
    minutes_until_start: minutesUntilAppointment(apt.confirmed_date, apt.confirmed_time),
    meeting_ended: isMeetingEnded(apt.confirmed_date, apt.confirmed_time),
    members,
    comments: mockBriefingComments[appointmentId] ?? [],
  };
}

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
      if (data.mbti_types && data.mbti_types.length > 2) {
        throw new Error("MBTI는 최대 2개까지 선택할 수 있습니다");
      }
      mockProfile = { ...mockProfile, ...data };
      if (data.selected_social_title_id) {
        const t = SOCIAL_POINT_TITLES.find((x) => x.id === data.selected_social_title_id);
        if (t) mockProfile.selected_social_title = t.title;
      }
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
    activityHeatmap: async (_id: string) => {
      await delay();
      return MOCK_ROOM_HEATMAP.map((d) => ({
        activity_on: d.activity_on,
        event_count: d.event_count,
      }));
    },
    create: async (data: RoomCreate) => {
      await delay();
      if (data.room_type !== "REGULAR" && !data.expire_date) {
        throw new Error("임시방은 터트릴 날짜(만료일)를 지정해야 합니다");
      }
      const isFixed = data.room_type === "REGULAR";
      const room: Room = {
        id: `demo-room-${Date.now()}`,
        name: data.name,
        description: data.description,
        purpose: data.purpose,
        room_type: data.room_type || "ONE_TIME",
        room_status: "ACTIVE",
        is_fixed: isFixed,
        expire_at: isFixed
          ? undefined
          : `${data.expire_date}T23:59:59Z`,
        member_count: 1,
        last_activity_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      mockRooms = [room, ...mockRooms];
      return room;
    },
    members: async (_roomId: string) => {
      await delay();
      return MOCK_ROOM_MEMBERS.map((m) => ({
        ...m,
        social_points: mockMemberPoints[m.user_id] ?? m.social_points,
      }));
    },
    praiseStatus: async (roomId: string, appointmentId: string) => {
      await delay();
      const key = `${roomId}:${appointmentId}:${mockProfile.id}`;
      const sent = mockPraiseVotes[key] ?? {};
      const my_votes = Object.entries(sent).map(([target_user_id, sticker]) => ({
        target_user_id,
        sticker,
        points_awarded: 5,
      }));
      const voted = new Set(Object.keys(sent));
      return {
        my_votes,
        pending_targets: MOCK_ROOM_MEMBERS.filter(
          (m) => !m.is_me && !voted.has(m.user_id)
        ).map((m) => ({ user_id: m.user_id, display_name: m.display_name })),
        points_per_vote: 5,
      };
    },
    submitPraise: async (
      roomId: string,
      appointmentId: string,
      data: { target_user_id: string; sticker: string }
    ) => {
      await delay();
      const key = `${roomId}:${appointmentId}:${mockProfile.id}`;
      if (!mockPraiseVotes[key]) mockPraiseVotes[key] = {};
      if (mockPraiseVotes[key][data.target_user_id]) {
        throw new Error("이미 이 멤버에게 스티커를 보냈습니다");
      }
      mockPraiseVotes[key][data.target_user_id] = data.sticker;
      mockMemberPoints[data.target_user_id] = (mockMemberPoints[data.target_user_id] ?? 0) + 5;
      if (data.target_user_id === mockProfile.id) {
        mockProfile.social_points += 5;
      }
      return { ok: true, points_awarded: 5 };
    },
    travelReward: async (
      roomId: string,
      appointmentId: string,
      targetUserId: string
    ) => {
      await delay();
      const tkey = `${roomId}:${appointmentId}`;
      if (mockTravelRewards[tkey]) {
        throw new Error("이 약속의 이동 리워드는 이미 지급되었습니다");
      }
      mockTravelRewards[tkey] = targetUserId;
      mockMemberPoints[targetUserId] = (mockMemberPoints[targetUserId] ?? 0) + 10;
      return { ok: true, points_awarded: 10 };
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
      if (id === "demo-apt-3") refreshDemoBriefingAppointment();
      const apt = mockAppointments.find((a) => a.id === id);
      if (!apt) throw new Error("약속을 찾을 수 없습니다");
      return { ...apt };
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
      if (placeId) seedConfirmTravelLogs(id);
      if (!mockBriefingComments[id]) mockBriefingComments[id] = [];
      return { status: "confirmed", date: voteDate, time: voteTime };
    },
    briefing: async (id: string) => {
      await delay();
      return buildMockBriefing(id);
    },
    addComment: async (id: string, body: string) => {
      await delay();
      const comment: AppointmentComment = {
        id: `bc-${Date.now()}`,
        user_id: mockProfile.id,
        display_name: mockProfile.display_name,
        body: body.trim(),
        created_at: new Date().toISOString(),
        is_me: true,
      };
      if (!mockBriefingComments[id]) mockBriefingComments[id] = [];
      mockBriefingComments[id].push(comment);
      return comment;
    },
    setDepartureStatus: async (id: string, status: DepartureStatus) => {
      await delay();
      if (!mockDepartureStatus[id]) mockDepartureStatus[id] = {};
      mockDepartureStatus[id][mockProfile.id] = status;
      return { ok: true, status };
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

export interface SocialPointTitle {
  id: number;
  title: string;
  min_points: number;
  badge_color: string;
  border_style: string;
}

export interface Profile {
  id: string;
  display_name: string;
  age_group: "TEENS" | "TWENTIES" | "THIRTIES" | "FORTIES" | "FIFTIES_PLUS";
  residence: string;
  home_address?: string;
  home_lat?: number;
  home_lng?: number;
  trust_score: number;
  social_points: number;
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
  selected_social_title_id?: number;
  selected_social_title?: string;
  mbti_types: string[];
  places_adopted_count: number;
  available_titles?: RecommenderTitle[];
  available_social_titles?: SocialPointTitle[];
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  room_type: "ONE_TIME" | "REGULAR";
  room_status: "ACTIVE" | "ARCHIVED";
  purpose?: string;
  is_fixed: boolean;
  expire_at?: string;
  last_activity_at?: string;
  member_count: number;
  created_at: string;
}

export interface RoomCreate {
  name: string;
  description?: string;
  purpose?: string;
  room_type?: "ONE_TIME" | "REGULAR";
  expire_date?: string;
}

export interface RoomActivityDay {
  activity_on: string;
  event_count: number;
}

export interface RoomMember {
  user_id: string;
  display_name: string;
  role: string;
  social_points: number;
  social_title?: string;
  social_badge_color?: string;
  mbti_types: string[];
  is_me: boolean;
}

export interface PraiseVoteStatus {
  my_votes: { target_user_id: string; sticker: string; points_awarded: number }[];
  pending_targets: { user_id: string; display_name: string }[];
  points_per_vote: number;
}

export type PraiseSticker =
  | "PUNCTUAL"
  | "MOOD_MAKER"
  | "GOOD_LISTENER"
  | "TEAM_PLAYER"
  | "LIFE_OF_PARTY";

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

export type DepartureStatus = "NOT_DEPARTED" | "EN_ROUTE";

export interface AppointmentComment {
  id: string;
  user_id: string;
  display_name: string;
  body: string;
  created_at: string;
  is_me?: boolean;
}

export interface MemberBriefingStatus {
  user_id: string;
  display_name: string;
  origin_label: string;
  duration_minutes?: number;
  distance_meters?: number;
  estimated_arrival?: string;
  punctuality: "ok" | "risk" | "late" | "unknown";
  departure_status: DepartureStatus;
  is_me?: boolean;
}

export interface AppointmentBriefing {
  appointment_id: string;
  title: string;
  confirmed_date: string;
  confirmed_time: string;
  place_name: string;
  place_address: string;
  minutes_until_start: number;
  meeting_ended: boolean;
  members: MemberBriefingStatus[];
  comments: AppointmentComment[];
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
