import {
  MOCK_APPOINTMENTS,
  MOCK_BRIEFING_COMMENTS,
  MOCK_DATE_SUMMARY,
  MOCK_DISCOVERABLE_ROOM,
  MOCK_FRIENDS,
  MOCK_HEATMAP,
  MOCK_MEMBER_BRIEFING,
  MOCK_PLACE_REVIEWS,
  MOCK_PLACES,
  MOCK_PROFILE,
  MOCK_RANKING,
  MOCK_ROOM_HEATMAP,
  MOCK_ROOM_MEMBERS,
  MOCK_ROOMS,
  MOCK_SETTLEMENT,
  MOCK_TEAM_SCHEDULE_DAY_MEMOS,
  MOCK_TIME_SUMMARY,
} from "./mock-data";
import {
  slotKey,
  toDateKey,
  getWeekStartMonday,
} from "./team-schedule-utils";
import {
  isMeetingEnded,
  minutesUntilAppointment,
  punctualityStatus,
} from "./appointment-time";
import { SOCIAL_POINT_TITLES } from "./social-points";
import type { ProfileDecorFields } from "./profile-decor-icons";
import {
  isValidProfileThemePreset,
  PROFILE_THEME_PRESET_IDS,
} from "./profile-decor-icons";
import { normalizeInterestEmojis } from "./profile-interests";
import { isValidRoomAccent } from "./room-accent";
import { isValidMeetingPurpose, type MeetingPurposeId } from "./meeting-purpose";
import { defaultInviteExpiry, generateInviteToken } from "./invite-token";

const SAMPLE_ROOM_IDS = new Set(["demo-room-1", "demo-room-2", "demo-room-invite-pending", "demo-team-schedule-1"]);

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

type HostTransferPending = {
  from_user_id: string;
  from_display_name: string;
  to_user_id: string;
  to_display_name: string;
};

function cloneRoomMembers(roomId: string): RoomMember[] {
  const base =
    roomId === "demo-room-2"
      ? MOCK_ROOM_MEMBERS.map((m) => ({ ...m, role: "MEMBER" }))
      : MOCK_ROOM_MEMBERS.map((m) => ({ ...m }));
  return base.map((m) => ({
    ...m,
    social_points: mockMemberPoints[m.user_id] ?? m.social_points,
    role: m.role as RoomMember["role"],
  })) as RoomMember[];
}

let mockRoomMembersState: Record<string, RoomMember[]> = {
  "demo-room-1": cloneRoomMembers("demo-room-1"),
  "demo-room-2": cloneRoomMembers("demo-room-2"),
  "demo-team-schedule-1": cloneRoomMembers("demo-team-schedule-1"),
  [MOCK_DISCOVERABLE_ROOM.id]: [
    {
      user_id: "demo-member-2",
      display_name: "친구 A",
      role: "OWNER",
      social_points: 150,
      social_title: "약속 지킴이",
      social_badge_color: "#60A5FA",
      mbti_types: ["ISTJ"],
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
      is_me: false,
    },
  ],
};

let mockHostTransferPending: Record<string, HostTransferPending> = {};
let mockRecommendationVotes: Record<string, "RECOMMEND" | "NOT_RECOMMEND"> = {};
let mockPlaceReviews: Record<string, string> = {};
let mockPlaceReviewsList: Record<string, Omit<PlaceReviewItem, "is_me">[]> = Object.fromEntries(
  Object.entries(MOCK_PLACE_REVIEWS).map(([id, rows]) => [id, rows.map((r) => ({ ...r }))])
) as Record<string, Omit<PlaceReviewItem, "is_me">[]>;

interface MockInviteLink {
  room_id: string;
  token: string;
  expires_at: string;
  created_by: string;
}

let mockInviteLinksByRoom: Record<string, MockInviteLink> = {};
let mockInviteTokenIndex: Record<string, string> = {};

function ensureInviteLink(roomId: string): MockInviteLink {
  const existing = mockInviteLinksByRoom[roomId];
  if (existing && new Date(existing.expires_at) > new Date()) return existing;

  const token = generateInviteToken();
  const link: MockInviteLink = {
    room_id: roomId,
    token,
    expires_at: defaultInviteExpiry(14),
    created_by: mockProfile.id,
  };
  if (existing) delete mockInviteTokenIndex[existing.token];
  mockInviteLinksByRoom[roomId] = link;
  mockInviteTokenIndex[token] = roomId;
  return link;
}

function previewInviteTokenInternal(token: string): InviteTokenPreview {
  const roomId = mockInviteTokenIndex[token.trim()];
  if (!roomId) throw new Error("유효하지 않거나 만료된 초대 링크입니다");
  const link = mockInviteLinksByRoom[roomId];
  const room = getCatalogRoom(roomId) ?? mockRooms.find((r) => r.id === roomId);
  if (!room || !link) throw new Error("방을 찾을 수 없습니다");
  const expired = new Date(link.expires_at) <= new Date();
  return {
    room_id: roomId,
    room_name: room.name,
    expires_at: link.expires_at,
    expired,
    is_member: isRoomMember(roomId, mockProfile.id),
    requires_join_password: roomHasJoinPassword(roomId),
  };
}

function assertRoomOwner(roomId: string) {
  const members = getRoomMembers(roomId);
  const owner = getRoomOwner(members);
  if (!owner || owner.user_id !== mockProfile.id) {
    throw new Error("방장만 이 작업을 할 수 있습니다");
  }
}

function enrichRoomMeta(room: Room): Room {
  const members = mockRoomMembersState[room.id] ?? cloneRoomMembers(room.id);
  const owner = members.find((m) => m.role === "OWNER");
  return attachRoomAccessMeta({
    ...room,
    is_me_owner: owner?.user_id === mockProfile.id,
    is_sample: room.is_sample ?? SAMPLE_ROOM_IDS.has(room.id),
  });
}

type InvitationStatus = "pending" | "accepted" | "rejected";

interface MockInvitation {
  id: string;
  room_id: string;
  room_name: string;
  inviter_id: string;
  inviter_display_name: string;
  invitee_id: string;
  status: InvitationStatus;
}

/** mock 전용 평문 — 실서비스는 DB에 bcrypt/argon2 해시만 저장 */
let mockRoomJoinPasswords: Record<string, string> = {
  [MOCK_DISCOVERABLE_ROOM.id]: "study2024",
};

const mockRoomCatalog: Record<string, Room> = {
  [MOCK_DISCOVERABLE_ROOM.id]: { ...MOCK_DISCOVERABLE_ROOM },
};

let mockInvitations: MockInvitation[] = [
  {
    id: "inv-seed-1",
    room_id: MOCK_DISCOVERABLE_ROOM.id,
    room_name: MOCK_DISCOVERABLE_ROOM.name,
    inviter_id: "demo-member-2",
    inviter_display_name: "친구 A",
    invitee_id: "demo-user",
    status: "pending",
  },
];

function getCatalogRoom(roomId: string): Room | undefined {
  return mockRooms.find((r) => r.id === roomId) ?? mockRoomCatalog[roomId];
}

function isRoomMember(roomId: string, userId: string): boolean {
  return getRoomMembers(roomId).some((m) => m.user_id === userId);
}

function roomHasJoinPassword(roomId: string): boolean {
  return Boolean(mockRoomJoinPasswords[roomId]);
}

function attachRoomAccessMeta(room: Room): Room {
  return { ...room, requires_join_password: roomHasJoinPassword(room.id) };
}

function addCurrentUserToRoom(roomId: string, role: "OWNER" | "MEMBER" = "MEMBER") {
  const catalog = getCatalogRoom(roomId);
  if (!catalog) throw new Error("방을 찾을 수 없습니다");
  if (isRoomMember(roomId, mockProfile.id)) return;

  if (!mockRooms.some((r) => r.id === roomId)) {
    mockRooms = [{ ...catalog, member_count: catalog.member_count + 1 }, ...mockRooms];
  } else {
    mockRooms = mockRooms.map((r) =>
      r.id === roomId ? { ...r, member_count: r.member_count + 1 } : r
    );
  }

  const existing = getRoomMembers(roomId);
  mockRoomMembersState[roomId] = [
    ...existing.filter((m) => !m.is_me),
    {
      user_id: mockProfile.id,
      display_name: mockProfile.display_name,
      role,
      social_points: mockProfile.social_points,
      social_title: mockProfile.selected_social_title,
      social_badge_color: "#2DD4BF",
      mbti_types: [...mockProfile.mbti_types],
      profile_decor: mockProfile.profile_decor ? { ...mockProfile.profile_decor } : undefined,
      is_me: true,
    },
  ];
}

function getRoomMembers(roomId: string): RoomMember[] {
  if (!mockRoomMembersState[roomId]) {
    mockRoomMembersState[roomId] = cloneRoomMembers(roomId);
  }
  return mockRoomMembersState[roomId];
}

function validateProfileDecor(decor: ProfileDecorFields): void {
  if (decor.accent_color != null && !isValidRoomAccent(decor.accent_color)) {
    throw new Error("강조색 형식이 올바르지 않습니다 (#RRGGBB)");
  }
  if (decor.theme_preset != null && !isValidProfileThemePreset(decor.theme_preset)) {
    throw new Error(`테마는 ${PROFILE_THEME_PRESET_IDS.join(", ")} 중 하나여야 합니다`);
  }
  if (decor.interest_emojis != null) {
    decor.interest_emojis = normalizeInterestEmojis(decor.interest_emojis);
  }
}

function syncMemberDecor(userId: string, decor?: ProfileDecorFields) {
  for (const roomId of Object.keys(mockRoomMembersState)) {
    mockRoomMembersState[roomId] = getRoomMembers(roomId).map((m) =>
      m.user_id === userId ? { ...m, profile_decor: decor ? { ...decor } : undefined } : m
    );
  }
}

function getRoomOwner(members: RoomMember[]): RoomMember | undefined {
  return members.find((m) => m.role === "OWNER");
}

function assignOwnerIfMissing(roomId: string, userId: string) {
  const members = getRoomMembers(roomId);
  if (getRoomOwner(members)) return;
  mockRoomMembersState[roomId] = members.map((m) =>
    m.user_id === userId ? { ...m, role: "OWNER" } : m
  );
}

function enrichPlace(p: Place): Place {
  return {
    ...p,
    my_rating: mockUserRatings[p.id],
    my_review: mockPlaceReviews[p.id],
    my_recommendation_vote: mockRecommendationVotes[p.id],
    is_sample: p.is_sample ?? p.id.startsWith("demo-place"),
  };
}

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
  replacePlaceId?: string,
  review?: string
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
  if (review !== undefined) {
    const trimmed = review.trim();
    if (trimmed) mockPlaceReviews[placeId] = trimmed;
    else delete mockPlaceReviews[placeId];
  }
  recalcPlaceAvg(placeId, rating, isNew);
  syncCurrentUserPlaceReview(placeId);
}

function syncCurrentUserPlaceReview(placeId: string) {
  const rating = mockUserRatings[placeId];
  if (rating === undefined) return;

  const review = mockPlaceReviews[placeId] ?? "";
  const entry: Omit<PlaceReviewItem, "is_me"> = {
    user_id: mockProfile.id,
    display_name: mockProfile.display_name,
    rating,
    review,
    created_at: new Date().toISOString(),
    mbti_types: [...mockProfile.mbti_types],
    profile_decor: mockProfile.profile_decor ? { ...mockProfile.profile_decor } : undefined,
  };

  if (!mockPlaceReviewsList[placeId]) {
    mockPlaceReviewsList[placeId] = [];
  }
  const idx = mockPlaceReviewsList[placeId].findIndex((r) => r.user_id === mockProfile.id);
  if (idx >= 0) {
    mockPlaceReviewsList[placeId][idx] = entry;
  } else {
    mockPlaceReviewsList[placeId].unshift(entry);
  }
}

function getPlaceReviews(placeId: string): PlaceReviewItem[] {
  return (mockPlaceReviewsList[placeId] ?? [])
    .map((r) => ({
      ...r,
      is_me: r.user_id === mockProfile.id,
    }))
    .sort((a, b) => {
      const aHas = Boolean(a.review.trim());
      const bHas = Boolean(b.review.trim());
      if (aHas !== bHas) return aHas ? -1 : 1;
      return b.created_at.localeCompare(a.created_at);
    });
}

function assertRoomOwnerForInvite(roomId: string) {
  const members = getRoomMembers(roomId);
  const owner = getRoomOwner(members);
  if (!owner || owner.user_id !== mockProfile.id) {
    throw new Error("방장만 초대할 수 있습니다");
  }
}

function inviteOneMember(roomId: string, inviteeId: string) {
  assertRoomOwnerForInvite(roomId);
  if (inviteeId === mockProfile.id) {
    throw new Error("본인은 초대할 수 없습니다");
  }
  if (isRoomMember(roomId, inviteeId)) {
    throw new Error("이미 방 멤버입니다");
  }
  const room = getCatalogRoom(roomId) ?? mockRooms.find((r) => r.id === roomId);
  if (!room) throw new Error("방을 찾을 수 없습니다");
  const friend = MOCK_FRIENDS.find((f) => f.user_id === inviteeId);
  const alreadyPending = mockInvitations.some(
    (i) => i.room_id === roomId && i.invitee_id === inviteeId && i.status === "pending"
  );
  if (alreadyPending) {
    throw new Error("이미 초대를 보냈습니다");
  }
  mockInvitations.push({
    id: `inv-${Date.now()}-${inviteeId}`,
    room_id: roomId,
    room_name: room.name,
    inviter_id: mockProfile.id,
    inviter_display_name: mockProfile.display_name,
    invitee_id: inviteeId,
    status: "pending",
  });
  return friend?.display_name ?? inviteeId;
}

export interface TeamScheduleDayMemo {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  schedule_date: string;
  memo: string;
  updated_at: string;
}

export interface TeamScheduleMemberWeek {
  user_id: string;
  display_name: string;
  is_me: boolean;
  slots: Record<string, boolean>;
  other_times: string;
}

export interface TeamScheduleWeekBoard {
  room_id: string;
  week_start: string;
  members: TeamScheduleMemberWeek[];
  slot_counts: Record<string, number>;
}

export interface MeetingPurposeSetting {
  purpose?: MeetingPurposeId;
  purpose_custom?: string;
}

type TeamScheduleWeekStore = {
  slots: Record<string, boolean>;
  other_times: string;
};

function teamWeekKey(roomId: string, weekStart: string, userId: string): string {
  return `${roomId}|${weekStart}|${userId}`;
}

let mockTeamScheduleMemos: TeamScheduleDayMemo[] = MOCK_TEAM_SCHEDULE_DAY_MEMOS.map((m) => ({ ...m }));
let mockTeamScheduleWeek: Record<string, TeamScheduleWeekStore> = {};
let mockRoomMeetingPurpose: Record<string, MeetingPurposeSetting> = {
  "demo-room-1": { purpose: "MONTHLY" },
};

export interface TeamMilestoneItem {
  id: string;
  label: string;
  done: boolean;
}

const DEFAULT_TEAM_MILESTONES: TeamMilestoneItem[] = [
  { id: "meeting", label: "회의", done: false },
  { id: "design", label: "디자인", done: false },
  { id: "qa", label: "QA", done: false },
  { id: "deploy", label: "배포", done: false },
];

let mockTeamMilestones: Record<string, TeamMilestoneItem[]> = {
  "demo-team-schedule-1": [
    { id: "meeting", label: "회의", done: true },
    { id: "design", label: "디자인", done: false },
    { id: "qa", label: "QA", done: false },
    { id: "deploy", label: "배포", done: false },
  ],
};

function getTeamMilestones(roomId: string): TeamMilestoneItem[] {
  return (mockTeamMilestones[roomId] ?? DEFAULT_TEAM_MILESTONES).map((item) => ({ ...item }));
}

function seedTeamScheduleWeekDemo() {
  const roomId = "demo-team-schedule-1";
  const weekStart = "2026-06-23";
  mockTeamScheduleWeek[teamWeekKey(roomId, weekStart, "demo-user")] = {
    slots: {
      [slotKey("2026-06-23", 10)]: true,
      [slotKey("2026-06-23", 14)]: true,
      [slotKey("2026-06-24", 9)]: true,
      [slotKey("2026-06-25", 15)]: true,
    },
    other_times: "수요일 07:30 잠깐 가능",
  };
  mockTeamScheduleWeek[teamWeekKey(roomId, weekStart, "demo-member-2")] = {
    slots: {
      [slotKey("2026-06-23", 14)]: true,
      [slotKey("2026-06-23", 15)]: true,
      [slotKey("2026-06-26", 11)]: true,
    },
    other_times: "",
  };
  mockTeamScheduleWeek[teamWeekKey(roomId, weekStart, "demo-member-3")] = {
    slots: {
      [slotKey("2026-06-24", 13)]: true,
      [slotKey("2026-06-25", 10)]: true,
      [slotKey("2026-06-25", 11)]: true,
    },
    other_times: "금요일 20시 이후",
  };
}

seedTeamScheduleWeekDemo();

function buildTeamScheduleWeekBoard(roomId: string, weekStart: string): TeamScheduleWeekBoard {
  const members = getRoomMembers(roomId).map((m) => {
    const stored = mockTeamScheduleWeek[teamWeekKey(roomId, weekStart, m.user_id)];
    return {
      user_id: m.user_id,
      display_name: m.display_name,
      is_me: Boolean(m.is_me),
      slots: stored?.slots ?? {},
      other_times: stored?.other_times ?? "",
    };
  });
  const slot_counts: Record<string, number> = {};
  for (const m of members) {
    for (const [key, on] of Object.entries(m.slots)) {
      if (on) slot_counts[key] = (slot_counts[key] ?? 0) + 1;
    }
  }
  return { room_id: roomId, week_start: weekStart, members, slot_counts };
}

function assertRoomMember(roomId: string) {
  if (!isRoomMember(roomId, mockProfile.id)) {
    throw new Error("방 멤버만 일정을 작성할 수 있습니다");
  }
}

export const api = {
  friends: {
    list: async () => {
      await delay();
      return MOCK_FRIENDS.filter((f) => f.user_id !== mockProfile.id);
    },
  },
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
      const { profile_decor, ...rest } = data;
      mockProfile = { ...mockProfile, ...rest };
      if (profile_decor !== undefined) {
        validateProfileDecor(profile_decor);
        mockProfile.profile_decor = { ...mockProfile.profile_decor, ...profile_decor };
        syncMemberDecor(mockProfile.id, mockProfile.profile_decor);
      }
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
    list: async () => {
      await delay();
      return mockRooms.map(enrichRoomMeta);
    },
    get: async (id: string) => {
      await delay();
      const r = mockRooms.find((x) => x.id === id);
      if (!r) throw new Error("방을 찾을 수 없습니다");
      return enrichRoomMeta(r);
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
      if (data.room_type !== "REGULAR" && data.room_type !== "TEAM_SCHEDULE" && !data.expire_date) {
        throw new Error("임시방은 터트릴 날짜(만료일)를 지정해야 합니다");
      }
      const isFixed = data.room_type === "REGULAR" || data.room_type === "TEAM_SCHEDULE";
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
        accent_color: data.accent_color,
      };
      if (data.join_password?.trim()) {
        mockRoomJoinPasswords[room.id] = data.join_password.trim();
      }
      mockRoomCatalog[room.id] = room;
      mockRooms = [room, ...mockRooms];
      mockRoomMembersState[room.id] = [
        {
          user_id: mockProfile.id,
          display_name: mockProfile.display_name,
          role: "OWNER",
          social_points: mockProfile.social_points,
          social_title: mockProfile.selected_social_title,
          social_badge_color: "#2DD4BF",
          mbti_types: [...mockProfile.mbti_types],
          profile_decor: mockProfile.profile_decor ? { ...mockProfile.profile_decor } : undefined,
          is_me: true,
        },
      ];
      ensureInviteLink(room.id);
      return enrichRoomMeta(room);
    },
    getInviteLink: async (roomId: string) => {
      await delay();
      assertRoomOwner(roomId);
      const link = ensureInviteLink(roomId);
      return {
        room_id: roomId,
        token: link.token,
        expires_at: link.expires_at,
        url: `/join/${link.token}`,
      } satisfies InviteLinkInfo;
    },
    regenerateInviteLink: async (roomId: string) => {
      await delay();
      assertRoomOwner(roomId);
      const old = mockInviteLinksByRoom[roomId];
      if (old) delete mockInviteTokenIndex[old.token];
      delete mockInviteLinksByRoom[roomId];
      const link = ensureInviteLink(roomId);
      return {
        room_id: roomId,
        token: link.token,
        expires_at: link.expires_at,
        url: `/join/${link.token}`,
      } satisfies InviteLinkInfo;
    },
    previewInviteToken: async (token: string) => {
      await delay();
      return previewInviteTokenInternal(token);
    },
    joinByInviteToken: async (token: string) => {
      await delay();
      const preview = previewInviteTokenInternal(token);
      if (preview.expired) {
        throw new Error("만료된 초대 링크입니다. 방장에게 새 링크를 요청하세요");
      }
      if (preview.is_member) {
        const existing = mockRooms.find((r) => r.id === preview.room_id);
        if (!existing) throw new Error("방을 찾을 수 없습니다");
        return { ok: true, room: enrichRoomMeta(existing) };
      }
      addCurrentUserToRoom(preview.room_id);
      const room = mockRooms.find((r) => r.id === preview.room_id);
      if (!room) throw new Error("방을 찾을 수 없습니다");
      return { ok: true, room: enrichRoomMeta(room) };
    },
    previewJoin: async (roomId: string) => {
      await delay();
      const room = getCatalogRoom(roomId.trim());
      if (!room) throw new Error("방을 찾을 수 없습니다");
      return {
        room_id: room.id,
        room_name: room.name,
        requires_join_password: roomHasJoinPassword(room.id),
        is_member: isRoomMember(room.id, mockProfile.id),
      };
    },
    joinWithPassword: async (roomId: string, password: string) => {
      await delay();
      const id = roomId.trim();
      const room = getCatalogRoom(id);
      if (!room) throw new Error("방을 찾을 수 없습니다");
      if (isRoomMember(id, mockProfile.id)) {
        throw new Error("이미 이 방의 멤버입니다");
      }
      const required = mockRoomJoinPasswords[id];
      if (!required) {
        throw new Error("이 방은 비밀번호 입장이 설정되어 있지 않습니다. 초대를 확인하세요.");
      }
      if (password !== required) {
        throw new Error("비밀번호가 올바르지 않습니다");
      }
      addCurrentUserToRoom(id);
      return attachRoomAccessMeta(mockRooms.find((r) => r.id === id)!);
    },
    listInviteCandidates: async (roomId: string) => {
      await delay();
      const memberIds = new Set(getRoomMembers(roomId).map((m) => m.user_id));
      return MOCK_FRIENDS.filter(
        (f) => f.user_id !== mockProfile.id && !memberIds.has(f.user_id)
      );
    },
    inviteMember: async (roomId: string, inviteeId: string) => {
      await delay();
      const invitee_display_name = inviteOneMember(roomId, inviteeId);
      return { ok: true, invitee_display_name };
    },
    inviteMembers: async (roomId: string, inviteeIds: string[]) => {
      await delay();
      const unique = [...new Set(inviteeIds.filter(Boolean))];
      if (unique.length === 0) {
        throw new Error("초대할 친구를 선택하세요");
      }

      const invited: { user_id: string; display_name: string }[] = [];
      const failed: { user_id: string; display_name: string; message: string }[] = [];

      for (const inviteeId of unique) {
        const display_name =
          MOCK_FRIENDS.find((f) => f.user_id === inviteeId)?.display_name ?? inviteeId;
        try {
          const name = inviteOneMember(roomId, inviteeId);
          invited.push({ user_id: inviteeId, display_name: name });
        } catch (err) {
          failed.push({
            user_id: inviteeId,
            display_name,
            message: err instanceof Error ? err.message : "초대 실패",
          });
        }
      }

      if (invited.length === 0) {
        throw new Error(failed[0]?.message ?? "초대에 실패했습니다");
      }

      return {
        ok: true as const,
        invited_count: invited.length,
        invited,
        failed,
      };
    },
    listMyInvitations: async () => {
      await delay();
      return mockInvitations
        .filter((i) => i.invitee_id === mockProfile.id && i.status === "pending")
        .map((i) => ({
          id: i.id,
          room_id: i.room_id,
          room_name: i.room_name,
          inviter_display_name: i.inviter_display_name,
          status: i.status,
        }));
    },
    acceptInvitation: async (roomId: string) => {
      await delay();
      const inv = mockInvitations.find(
        (i) =>
          i.room_id === roomId &&
          i.invitee_id === mockProfile.id &&
          i.status === "pending"
      );
      if (!inv) throw new Error("대기 중인 초대가 없습니다");
      if (isRoomMember(roomId, mockProfile.id)) {
        inv.status = "accepted";
        return {
          ok: true,
          room: attachRoomAccessMeta(mockRooms.find((r) => r.id === roomId)!),
          password_required_on_join: roomHasJoinPassword(roomId),
        };
      }
      inv.status = "accepted";
      addCurrentUserToRoom(roomId);
      return {
        ok: true,
        room: attachRoomAccessMeta(mockRooms.find((r) => r.id === roomId)!),
        password_required_on_join: roomHasJoinPassword(roomId),
      };
    },
    rejectInvitation: async (roomId: string) => {
      await delay();
      const inv = mockInvitations.find(
        (i) =>
          i.room_id === roomId &&
          i.invitee_id === mockProfile.id &&
          i.status === "pending"
      );
      if (!inv) throw new Error("대기 중인 초대가 없습니다");
      inv.status = "rejected";
      return { ok: true };
    },
    setJoinPassword: async (roomId: string, password: string | null) => {
      await delay();
      const owner = getRoomOwner(getRoomMembers(roomId));
      if (!owner || owner.user_id !== mockProfile.id) {
        throw new Error("방장만 비밀번호를 설정할 수 있습니다");
      }
      if (password?.trim()) {
        mockRoomJoinPasswords[roomId] = password.trim();
      } else {
        delete mockRoomJoinPasswords[roomId];
      }
      return { ok: true, requires_join_password: roomHasJoinPassword(roomId) };
    },
    members: async (roomId: string) => {
      await delay();
      return getRoomMembers(roomId).map((m) => ({ ...m }));
    },
    hostTransferStatus: async (roomId: string) => {
      await delay();
      const members = getRoomMembers(roomId);
      const owner = getRoomOwner(members);
      const pending = mockHostTransferPending[roomId];
      return {
        owner_user_id: owner?.user_id ?? null,
        owner_display_name: owner?.display_name ?? null,
        is_me_owner: owner?.user_id === mockProfile.id,
        pending: pending
          ? {
              from_user_id: pending.from_user_id,
              from_display_name: pending.from_display_name,
              to_user_id: pending.to_user_id,
              to_display_name: pending.to_display_name,
              is_for_me: pending.to_user_id === mockProfile.id,
            }
          : null,
        transfer_candidates: members.filter(
          (m) => m.user_id !== mockProfile.id && m.user_id !== owner?.user_id
        ),
      };
    },
    requestHostTransfer: async (roomId: string, targetUserId: string) => {
      await delay();
      const members = getRoomMembers(roomId);
      const owner = getRoomOwner(members);
      if (!owner || owner.user_id !== mockProfile.id) {
        throw new Error("방장만 인도를 요청할 수 있습니다");
      }
      if (mockHostTransferPending[roomId]) {
        throw new Error("이미 진행 중인 인도 요청이 있습니다");
      }
      const target = members.find((m) => m.user_id === targetUserId);
      if (!target) throw new Error("멤버를 찾을 수 없습니다");
      if (targetUserId === mockProfile.id) {
        throw new Error("본인에게는 넘길 수 없습니다");
      }
      mockHostTransferPending[roomId] = {
        from_user_id: mockProfile.id,
        from_display_name: mockProfile.display_name,
        to_user_id: targetUserId,
        to_display_name: target.display_name,
      };
      return { ok: true };
    },
    respondHostTransfer: async (
      roomId: string,
      accept: boolean,
      options?: { demo?: boolean }
    ) => {
      await delay();
      const pending = mockHostTransferPending[roomId];
      if (!pending) throw new Error("대기 중인 인도 요청이 없습니다");
      if (!options?.demo && pending.to_user_id !== mockProfile.id) {
        throw new Error("인도 대상만 응답할 수 있습니다");
      }
      if (accept) {
        mockRoomMembersState[roomId] = getRoomMembers(roomId).map((m) => {
          if (m.user_id === pending.from_user_id) return { ...m, role: "MEMBER" };
          if (m.user_id === pending.to_user_id) return { ...m, role: "OWNER" };
          return m;
        });
      }
      delete mockHostTransferPending[roomId];
      return { ok: true, accepted: accept };
    },
    cancelHostTransfer: async (roomId: string) => {
      await delay();
      const pending = mockHostTransferPending[roomId];
      if (!pending) throw new Error("취소할 인도 요청이 없습니다");
      if (pending.from_user_id !== mockProfile.id) {
        throw new Error("요청한 방장만 취소할 수 있습니다");
      }
      delete mockHostTransferPending[roomId];
      return { ok: true };
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
        pending_targets: getRoomMembers(roomId).filter(
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
      assertRoomOwner(id);
      mockRooms = mockRooms.map((r) =>
        r.id === id ? { ...r, room_type: "REGULAR" as const, is_fixed: true } : r
      );
      const updated = mockRooms.find((r) => r.id === id)!;
      return enrichRoomMeta(updated);
    },
    delete: async (id: string) => {
      await delay();
      assertRoomOwner(id);
      const room = mockRooms.find((r) => r.id === id);
      if (!room) throw new Error("방을 찾을 수 없습니다");
      if (room.room_type !== "ONE_TIME") {
        throw new Error("임시방만 삭제할 수 있습니다. 고정방은 보관 정책이 적용됩니다");
      }
      mockRooms = mockRooms.filter((r) => r.id !== id);
      delete mockRoomMembersState[id];
      const link = mockInviteLinksByRoom[id];
      if (link) {
        delete mockInviteTokenIndex[link.token];
        delete mockInviteLinksByRoom[id];
      }
    },
    getMeetingPurpose: async (roomId: string) => {
      await delay();
      return { ...(mockRoomMeetingPurpose[roomId] ?? {}) };
    },
    updateMeetingPurpose: async (roomId: string, data: MeetingPurposeSetting) => {
      await delay();
      assertRoomMember(roomId);
      if (data.purpose != null && !isValidMeetingPurpose(data.purpose)) {
        throw new Error("모임 주목적을 선택해 주세요");
      }
      if (data.purpose === "OTHER" && !data.purpose_custom?.trim()) {
        throw new Error("기타 목적을 입력해 주세요");
      }
      const next: MeetingPurposeSetting = {
        purpose: data.purpose,
        purpose_custom:
          data.purpose === "OTHER" ? data.purpose_custom?.trim() : undefined,
      };
      mockRoomMeetingPurpose[roomId] = next;
      return { ...next };
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
      assignOwnerIfMissing(data.room_id, mockProfile.id);
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
    deleteComment: async (appointmentId: string, commentId: string) => {
      await delay();
      const list = mockBriefingComments[appointmentId] ?? [];
      const target = list.find((c) => c.id === commentId);
      if (!target) throw new Error("댓글을 찾을 수 없습니다");
      if (target.user_id !== mockProfile.id && mockProfile.role !== "ADMIN") {
        throw new Error("삭제 권한이 없습니다");
      }
      mockBriefingComments[appointmentId] = list.filter((c) => c.id !== commentId);
      return { ok: true };
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
  teamSchedule: {
    listMonthMemos: async (roomId: string, year: number, month: number) => {
      await delay();
      const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
      return mockTeamScheduleMemos
        .filter((m) => m.room_id === roomId && m.schedule_date.startsWith(monthPrefix))
        .sort((a, b) => a.schedule_date.localeCompare(b.schedule_date));
    },
    upsertDayMemo: async (roomId: string, scheduleDate: string, memo: string) => {
      await delay();
      assertRoomMember(roomId);
      const trimmed = memo.trim();
      const existingIdx = mockTeamScheduleMemos.findIndex(
        (m) =>
          m.room_id === roomId &&
          m.schedule_date === scheduleDate &&
          m.user_id === mockProfile.id
      );
      if (!trimmed) {
        if (existingIdx >= 0) mockTeamScheduleMemos.splice(existingIdx, 1);
        return null;
      }
      const now = new Date().toISOString();
      if (existingIdx >= 0) {
        mockTeamScheduleMemos[existingIdx] = {
          ...mockTeamScheduleMemos[existingIdx]!,
          memo: trimmed,
          updated_at: now,
        };
        return mockTeamScheduleMemos[existingIdx]!;
      }
      const entry: TeamScheduleDayMemo = {
        id: `tsm-${Date.now()}`,
        room_id: roomId,
        user_id: mockProfile.id,
        display_name: mockProfile.display_name,
        schedule_date: scheduleDate,
        memo: trimmed,
        updated_at: now,
      };
      mockTeamScheduleMemos.push(entry);
      return entry;
    },
    getWeekBoard: async (roomId: string, weekStart?: string) => {
      await delay();
      const start = weekStart ?? toDateKey(getWeekStartMonday());
      return buildTeamScheduleWeekBoard(roomId, start);
    },
    saveMyWeek: async (
      roomId: string,
      weekStart: string,
      slots: Record<string, boolean>,
      otherTimes: string
    ) => {
      await delay();
      assertRoomMember(roomId);
      mockTeamScheduleWeek[teamWeekKey(roomId, weekStart, mockProfile.id)] = {
        slots: { ...slots },
        other_times: otherTimes.trim(),
      };
      return buildTeamScheduleWeekBoard(roomId, weekStart);
    },
    getMilestones: async (roomId: string) => {
      await delay();
      return getTeamMilestones(roomId);
    },
    toggleMilestone: async (roomId: string, itemId: string) => {
      await delay();
      assertRoomMember(roomId);
      const items = getTeamMilestones(roomId);
      const idx = items.findIndex((item) => item.id === itemId);
      if (idx < 0) throw new Error("마일스톤을 찾을 수 없습니다");
      items[idx] = { ...items[idx]!, done: !items[idx]!.done };
      mockTeamMilestones[roomId] = items;
      return getTeamMilestones(roomId);
    },
  },
  places: {
    list: async (roomId?: string) => {
      await delay();
      const list = roomId ? mockPlaces : mockPlaces;
      return list.map(enrichPlace);
    },
    get: async (id: string) => {
      await delay();
      const p = mockPlaces.find((x) => x.id === id);
      if (!p) throw new Error("장소를 찾을 수 없습니다");
      return enrichPlace(p);
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
      return enrichPlace(place);
    },
    rate: async (
      id: string,
      data: { rating: number; replace_place_id?: string; review?: string }
    ) => {
      await delay();
      applyMockRating(id, data.rating, data.replace_place_id, data.review);
      return { ok: true };
    },
    listReviews: async (placeId: string) => {
      await delay();
      const place = mockPlaces.find((p) => p.id === placeId);
      if (!place) throw new Error("장소를 찾을 수 없습니다");
      const reviews = getPlaceReviews(placeId);
      return {
        place_id: placeId,
        place_name: place.name,
        reviews,
        review_count: reviews.filter((r) => r.review.trim()).length,
      };
    },
    deleteReview: async (placeId: string, userId: string) => {
      await delay();
      const list = mockPlaceReviewsList[placeId] ?? [];
      const target = list.find((r) => r.user_id === userId);
      if (!target) throw new Error("리뷰를 찾을 수 없습니다");
      if (userId !== mockProfile.id && mockProfile.role !== "ADMIN") {
        throw new Error("삭제 권한이 없습니다");
      }
      mockPlaceReviewsList[placeId] = list.filter((r) => r.user_id !== userId);
      if (userId === mockProfile.id) {
        delete mockPlaceReviews[placeId];
        delete mockUserRatings[placeId];
      }
      return { ok: true };
    },
    voteRecommendation: async (id: string, vote: "RECOMMEND" | "NOT_RECOMMEND") => {
      await delay();
      if (mockRecommendationVotes[id] === vote) {
        delete mockRecommendationVotes[id];
      } else {
        mockRecommendationVotes[id] = vote;
      }
      return { ok: true, my_vote: mockRecommendationVotes[id] ?? null };
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
  profile_decor?: ProfileDecorFields;
  places_adopted_count: number;
  available_titles?: RecommenderTitle[];
  available_social_titles?: SocialPointTitle[];
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  room_type: "ONE_TIME" | "REGULAR" | "TEAM_SCHEDULE";
  room_status: "ACTIVE" | "ARCHIVED";
  purpose?: string;
  is_fixed: boolean;
  expire_at?: string;
  last_activity_at?: string;
  member_count: number;
  created_at: string;
  accent_color?: string;
  /** 입장 시 비밀번호 필요 여부 (평문 비밀번호는 절대 내려보내지 않음) */
  requires_join_password?: boolean;
  /** 현재 사용자가 방장인지 */
  is_me_owner?: boolean;
  /** 예시(mock) 데이터 여부 */
  is_sample?: boolean;
}

export interface InviteLinkInfo {
  room_id: string;
  token: string;
  expires_at: string;
  url: string;
}

export interface InviteTokenPreview {
  room_id: string;
  room_name: string;
  expires_at: string;
  expired: boolean;
  is_member: boolean;
  requires_join_password: boolean;
}

export interface RoomCreate {
  name: string;
  description?: string;
  purpose?: string;
  room_type?: "ONE_TIME" | "REGULAR" | "TEAM_SCHEDULE";
  expire_date?: string;
  accent_color?: string;
  /** mock·실API 모두 서버/DB에서만 검증 — 클라이언트 저장 금지 */
  join_password?: string;
}

export interface JoinPreview {
  room_id: string;
  room_name: string;
  requires_join_password: boolean;
  is_member: boolean;
}

export interface RoomInvitationItem {
  id: string;
  room_id: string;
  room_name: string;
  inviter_display_name: string;
  status: "pending" | "accepted" | "rejected";
}

export interface FriendSummary {
  user_id: string;
  display_name: string;
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
  profile_decor?: ProfileDecorFields;
  is_me: boolean;
}

export interface HostTransferPendingInfo {
  from_user_id: string;
  from_display_name: string;
  to_user_id: string;
  to_display_name: string;
  is_for_me: boolean;
}

export interface HostTransferStatus {
  owner_user_id: string | null;
  owner_display_name: string | null;
  is_me_owner: boolean;
  pending: HostTransferPendingInfo | null;
  transfer_candidates: { user_id: string; display_name: string }[];
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
  my_rating?: number;
  my_review?: string;
  my_recommendation_vote?: "RECOMMEND" | "NOT_RECOMMEND" | null;
  is_sample?: boolean;
}

export interface PlaceReviewItem {
  user_id: string;
  display_name: string;
  rating: number;
  review: string;
  created_at: string;
  is_me: boolean;
  mbti_types?: string[];
  profile_decor?: ProfileDecorFields;
}

export interface PlaceReviewsResponse {
  place_id: string;
  place_name: string;
  reviews: PlaceReviewItem[];
  review_count: number;
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
  TEAM_SCHEDULE: "팀 일정",
};

export const ROOM_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "사용 중",
  ARCHIVED: "보관됨",
};

["demo-room-1", "demo-room-2", "demo-team-schedule-1"].forEach((id) => {
  if (mockRooms.some((r) => r.id === id)) ensureInviteLink(id);
});
