import { getApiMode } from "@/lib/api-config";
import { apiFetch, apiFetchPublic, getAccessToken, getCurrentUserId } from "@/lib/api/http-client";
import { isGuestSession } from "@/lib/auth-session";
import type {
  Appointment,
  AppointmentBriefing,
  AppointmentComment,
  AppointmentCreate,
  DateVote,
  DepartureStatus,
  FriendSummary,
  HostTransferStatus,
  InviteLinkInfo,
  InviteTokenPreview,
  JoinPreview,
  MeetingMemoryListItem,
  MeetingMemoryMemoItem,
  MeetingPurposeSetting,
  MeetingSettlement,
  Place,
  PlaceCreate,
  PlaceReviewsResponse,
  PraiseSticker,
  Profile,
  PublicProfileView,
  ProfileSearchHit,
  RankingEntry,
  RatingQuota,
  Room,
  RoomCreate,
  RoomInvitationItem,
  RoomMember,
  SavedLocation,
  TeamMilestoneItem,
  TeamScheduleDayMemo,
  TeamScheduleWeekBoard,
  TimeSlotSummary,
  TimeVote,
  TravelTimeRequest,
  TravelTimeResponse,
  TravelRouteResponse,
  VoteSummary,
} from "@/lib/api";
import type { MeetingPurposeId } from "@/lib/meeting-purpose";

type MockApi = {
  profiles: {
    me: () => Promise<Profile>;
    get: (userId: string) => Promise<PublicProfileView>;
    ratingQuota: () => Promise<RatingQuota>;
    ranking: (limit?: number) => Promise<RankingEntry[]>;
    update: (data: Partial<Profile>) => Promise<Profile>;
    attendanceHeatmap: () => Promise<{ date: string; count: number }[]>;
    verifySecurity: (pin: string) => Promise<{ verified: boolean }>;
    search: (q: string) => Promise<ProfileSearchHit[]>;
  };
  savedLocations: {
    list: () => Promise<SavedLocation[]>;
    create: (data: {
      label: string;
      description?: string;
      address: string;
      lat: number;
      lng: number;
      is_default?: boolean;
    }) => Promise<SavedLocation>;
    update: (
      id: string,
      data: Partial<{
        label: string;
        description?: string;
        address: string;
        lat: number;
        lng: number;
        is_default: boolean;
      }>
    ) => Promise<SavedLocation>;
    delete: (id: string) => Promise<{ ok: boolean }>;
  };
  rooms: {
    list: () => Promise<Room[]>;
    get: (id: string) => Promise<Room>;
    create: (data: RoomCreate) => Promise<Room>;
    members: (roomId: string) => Promise<RoomMember[]>;
    activityHeatmap: (id: string) => Promise<{ activity_on: string; event_count: number }[]>;
    promote: (id: string) => Promise<Room>;
    delete: (id: string) => Promise<void>;
    acceptInvitation: (roomId: string) => Promise<{
      ok: boolean;
      room: Room;
      password_required_on_join?: boolean;
    }>;
    rejectInvitation: (roomId: string) => Promise<{ ok: boolean }>;
    inviteMember: (
      roomId: string,
      inviteeId: string
    ) => Promise<{ ok: boolean; invitee_display_name: string }>;
    inviteMembers: (
      roomId: string,
      inviteeIds: string[]
    ) => Promise<{
      ok: boolean;
      invited_count: number;
      invited: { user_id: string; display_name: string }[];
      failed: { user_id: string; display_name: string; message: string }[];
    }>;
    listMyInvitations: () => Promise<RoomInvitationItem[]>;
    getMeetingPurpose: (roomId: string) => Promise<MeetingPurposeSetting>;
    updateMeetingPurpose: (roomId: string, data: MeetingPurposeSetting) => Promise<MeetingPurposeSetting>;
    praiseStatus: (roomId: string, appointmentId: string) => Promise<import("@/lib/api").PraiseVoteStatus>;
    submitPraise: (
      roomId: string,
      appointmentId: string,
      data: { target_user_id: string; sticker: PraiseSticker }
    ) => Promise<{ ok: boolean; points_awarded: number }>;
    travelReward: (
      roomId: string,
      appointmentId: string,
      targetUserId: string
    ) => Promise<{ ok: boolean; points_awarded: number }>;
    getInviteLink: (roomId: string) => Promise<InviteLinkInfo>;
    regenerateInviteLink: (roomId: string) => Promise<InviteLinkInfo>;
    previewInviteToken: (token: string) => Promise<InviteTokenPreview>;
    joinByInviteToken: (token: string) => Promise<{ ok: boolean; room: Room }>;
    previewJoin: (roomId: string) => Promise<JoinPreview>;
    joinWithPassword: (roomId: string, password: string) => Promise<Room>;
    listInviteCandidates: (roomId: string) => Promise<FriendSummary[]>;
    setJoinPassword: (
      roomId: string,
      password: string | null
    ) => Promise<{ ok: boolean; requires_join_password: boolean }>;
    hostTransferStatus: (roomId: string) => Promise<HostTransferStatus>;
    requestHostTransfer: (roomId: string, targetUserId: string) => Promise<{ ok: boolean }>;
    respondHostTransfer: (
      roomId: string,
      accept: boolean,
      options?: { demo?: boolean }
    ) => Promise<{ ok: boolean; accepted: boolean }>;
    cancelHostTransfer: (roomId: string) => Promise<{ ok: boolean }>;
  };
  friends: {
    list: () => Promise<FriendSummary[]>;
    add: (friendId: string) => Promise<FriendSummary>;
    remove: (friendId: string) => Promise<{ ok: boolean }>;
  };
  teamSchedule: {
    listMonthMemos: (
      roomId: string,
      year: number,
      month: number
    ) => Promise<TeamScheduleDayMemo[]>;
    upsertDayMemo: (
      roomId: string,
      scheduleDate: string,
      memo: string
    ) => Promise<TeamScheduleDayMemo | null>;
    getWeekBoard: (roomId: string, weekStart?: string) => Promise<TeamScheduleWeekBoard>;
    saveMyWeek: (
      roomId: string,
      weekStart: string,
      slots: Record<string, boolean>,
      otherTimes: string
    ) => Promise<TeamScheduleWeekBoard>;
    getMilestones: (roomId: string) => Promise<TeamMilestoneItem[]>;
    toggleMilestone: (roomId: string, itemId: string) => Promise<TeamMilestoneItem[]>;
  };
  places: {
    list: (roomId?: string) => Promise<Place[]>;
    create: (data: PlaceCreate) => Promise<Place>;
    rate: (
      id: string,
      data: { rating: number; replace_place_id?: string; review?: string }
    ) => Promise<{ ok: boolean }>;
    listReviews: (placeId: string) => Promise<unknown>;
    deleteReview: (placeId: string, userId: string) => Promise<{ ok: boolean }>;
    delete: (id: string) => Promise<{ ok: boolean }>;
    voteRecommendation: (
      id: string,
      vote: "RECOMMEND" | "NOT_RECOMMEND"
    ) => Promise<{ ok: boolean; my_vote: "RECOMMEND" | "NOT_RECOMMEND" | null }>;
    get: (id: string) => Promise<Place>;
    travelTime: (req: TravelTimeRequest) => Promise<TravelTimeResponse>;
    travelRoute: (req: TravelTimeRequest) => Promise<TravelRouteResponse>;
  };
  analytics: {
    recordVisit: (data: {
      path: string;
      sessionKey: string;
      userAgent?: string;
      referrer?: string;
    }) => Promise<void>;
    todayCount: () => Promise<{ count: number; date: string }>;
    listVisits: (params: {
      dateFrom?: string;
      dateTo?: string;
      browser?: string;
      path?: string;
      ip?: string;
      limit?: number;
      offset?: number;
    }) => Promise<{
      items: Array<{
        id: string;
        visited_at: string;
        session_key: string;
        user_id?: string | null;
        display_name?: string | null;
        path: string;
        browser_family: string;
        os_family: string;
        ip_hash: string;
        ip_masked?: string | null;
        user_agent?: string | null;
        referrer?: string | null;
      }>;
      total: number;
      limit: number;
      offset: number;
    }>;
  };
  appointments: {
    listMeetingMemories: () => Promise<MeetingMemoryListItem[]>;
    listMeetingMemos: (appointmentId: string) => Promise<MeetingMemoryMemoItem[]>;
    upsertMyMeetingMemo: (
      appointmentId: string,
      body: string
    ) => Promise<MeetingMemoryMemoItem>;
    listByRoom: (roomId: string) => Promise<Appointment[]>;
    create: (data: AppointmentCreate) => Promise<Appointment>;
    get: (id: string) => Promise<Appointment>;
    submitDateVote: (id: string, data: DateVote) => Promise<{ ok: boolean }>;
    dateSummary: (id: string) => Promise<VoteSummary[]>;
    advanceToTimeVote: (id: string) => Promise<{ status: string }>;
    submitTimeVote: (id: string, data: TimeVote) => Promise<{ ok: boolean }>;
    timeSummary: (id: string) => Promise<TimeSlotSummary[]>;
    confirm: (
      id: string,
      voteDate: string,
      voteTime: string,
      placeId?: string
    ) => Promise<{ status: string; date: string; time: string }>;
    briefing: (id: string) => Promise<AppointmentBriefing>;
    addComment: (id: string, body: string) => Promise<AppointmentComment>;
    deleteComment: (appointmentId: string, commentId: string) => Promise<{ ok: boolean }>;
    setDepartureStatus: (id: string, status: DepartureStatus) => Promise<{ ok: boolean }>;
    settlement: (id: string) => Promise<MeetingSettlement>;
  };
};

async function useHttp(): Promise<boolean> {
  const mode = getApiMode();
  if (mode === "mock") return false;
  if (typeof window !== "undefined" && isGuestSession()) return false;
  const token = await getAccessToken();
  return !!token;
}

function mapProfile(raw: Profile): Profile {
  return {
    ...raw,
    id: String(raw.id),
    mbti_types: raw.mbti_types ?? [],
    trust_score: Number(raw.trust_score ?? 0),
    social_points: Number(raw.social_points ?? 0),
    places_adopted_count: Number(raw.places_adopted_count ?? 0),
    profile_decor: raw.profile_decor ?? undefined,
    status_message: raw.status_message ?? undefined,
  };
}

function toPublicView(profile: Profile, meId: string | null): PublicProfileView {
  const trustFromList = profile.available_titles?.find((t) => t.id === profile.selected_title_id);
  const socialFromList = profile.available_social_titles?.find(
    (t) => t.id === profile.selected_social_title_id
  );
  return {
    id: profile.id,
    display_name: profile.display_name,
    age_group: profile.age_group,
    residence: profile.residence,
    status_message: profile.status_message,
    mbti_types: [...profile.mbti_types],
    profile_decor: profile.profile_decor ? { ...profile.profile_decor } : undefined,
    trust_score: profile.trust_score,
    social_points: profile.social_points,
    badge_tier: profile.badge_tier,
    role: profile.role,
    places_adopted_count: profile.places_adopted_count,
    selected_title_id: profile.selected_title_id,
    selected_social_title_id: profile.selected_social_title_id,
    trust_title: profile.selected_title ?? trustFromList?.title,
    trust_badge_color: trustFromList?.badge_color,
    social_title: profile.selected_social_title ?? socialFromList?.title,
    social_badge_color: socialFromList?.badge_color,
    available_titles: profile.available_titles,
    available_social_titles: profile.available_social_titles,
    is_me: meId != null && profile.id === meId,
  };
}

function mapRoom(raw: Room): Room {
  return {
    ...raw,
    id: String(raw.id),
    member_count: Number(raw.member_count ?? 0),
    is_me_owner: Boolean(raw.is_me_owner),
    meeting_purpose: raw.meeting_purpose as MeetingPurposeId | undefined,
    meeting_purpose_custom: raw.meeting_purpose_custom ?? undefined,
  };
}

function purposeFromRoom(raw: Room): MeetingPurposeSetting {
  return {
    purpose: raw.meeting_purpose as MeetingPurposeId | undefined,
    purpose_custom: raw.meeting_purpose_custom ?? undefined,
  };
}

function mapAppointment(raw: Appointment): Appointment {
  return {
    ...raw,
    id: String(raw.id),
    room_id: String(raw.room_id),
    confirmed_place_id: raw.confirmed_place_id ? String(raw.confirmed_place_id) : undefined,
  };
}

function mapPlace(raw: Place): Place {
  return {
    ...raw,
    id: String(raw.id),
    avg_rating: Number(raw.avg_rating ?? 0),
    rating_count: Number(raw.rating_count ?? 0),
    is_mine: Boolean(raw.is_mine),
  };
}

function mapRoomMember(raw: RoomMember): RoomMember {
  return {
    ...raw,
    user_id: String(raw.user_id),
    social_points: Number(raw.social_points ?? 0),
    mbti_types: raw.mbti_types ?? [],
  };
}

export function applyHybridOverrides<T extends MockApi>(mock: T): T {
  if (getApiMode() === "mock") {
    return mock;
  }

  return {
    ...mock,
    profiles: {
      ...mock.profiles,
      me: async () => {
        if (!(await useHttp())) return mock.profiles.me();
        const raw = await apiFetch<Profile>("/profiles/me");
        return mapProfile(raw);
      },
      get: async (userId: string) => {
        if (!(await useHttp())) return mock.profiles.get(userId);
        const meId = await getCurrentUserId();
        const raw = await apiFetch<Profile>(`/profiles/${userId}`);
        return toPublicView(mapProfile(raw), meId);
      },
      ratingQuota: async () => {
        if (!(await useHttp())) return mock.profiles.ratingQuota();
        return apiFetch<RatingQuota>("/profiles/me/rating-quota");
      },
      ranking: async (limit = 50) => {
        if (!(await useHttp())) return mock.profiles.ranking(limit);
        const rows = await apiFetch<RankingEntry[]>(`/profiles/ranking?limit=${limit}`);
        return rows.map((row) => ({
          ...row,
          user_id: String(row.user_id),
        }));
      },
      update: async (data: Partial<Profile>) => {
        if (!(await useHttp())) return mock.profiles.update(data);
        const raw = await apiFetch<Profile>("/profiles/me", {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        return mapProfile(raw);
      },
      attendanceHeatmap: async () => {
        if (!(await useHttp())) return mock.profiles.attendanceHeatmap();
        const rows = await apiFetch<{ date: string; count: number }[]>(
          "/profiles/me/attendance-heatmap"
        );
        return rows.map((row) => ({
          date: String(row.date),
          count: Number(row.count),
        }));
      },
      search: async (q: string) => {
        if (!(await useHttp())) return mock.profiles.search(q);
        const rows = await apiFetch<ProfileSearchHit[]>(
          `/profiles/search?q=${encodeURIComponent(q.trim())}`
        );
        return rows.map((r) => ({
          user_id: String(r.user_id),
          display_name: r.display_name,
          residence: r.residence,
        }));
      },
    },
    savedLocations: {
      ...mock.savedLocations,
      list: async () => {
        if (!(await useHttp())) return mock.savedLocations.list();
        const rows = await apiFetch<SavedLocation[]>("/saved-locations");
        return rows.map((row) => ({
          ...row,
          id: String(row.id),
          lat: Number(row.lat),
          lng: Number(row.lng),
        }));
      },
      create: async (data) => {
        if (!(await useHttp())) return mock.savedLocations.create(data);
        const raw = await apiFetch<SavedLocation>("/saved-locations", {
          method: "POST",
          body: JSON.stringify(data),
        });
        return { ...raw, id: String(raw.id) };
      },
      update: async (id, data) => {
        if (!(await useHttp())) return mock.savedLocations.update(id, data);
        const raw = await apiFetch<SavedLocation>(`/saved-locations/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        return { ...raw, id: String(raw.id) };
      },
      delete: async (id) => {
        if (!(await useHttp())) return mock.savedLocations.delete(id);
        await apiFetch(`/saved-locations/${id}`, { method: "DELETE" });
        return { ok: true };
      },
    },
    rooms: {
      ...mock.rooms,
      list: async () => {
        if (!(await useHttp())) return mock.rooms.list();
        const rows = await apiFetch<Room[]>("/rooms");
        return rows.map(mapRoom);
      },
      get: async (id: string) => {
        if (!(await useHttp())) return mock.rooms.get(id);
        return mapRoom(await apiFetch<Room>(`/rooms/${id}`));
      },
      create: async (data: RoomCreate) => {
        if (!(await useHttp())) return mock.rooms.create(data);
        const payload: Record<string, unknown> = {
          name: data.name,
          description: data.description,
          purpose: data.purpose,
          meeting_purpose: data.meeting_purpose,
          meeting_purpose_custom: data.meeting_purpose_custom,
          room_type: data.room_type ?? "ONE_TIME",
          expire_date: data.expire_date,
          accent_color: data.accent_color,
          join_password: data.join_password,
        };
        return mapRoom(await apiFetch<Room>("/rooms", { method: "POST", body: JSON.stringify(payload) }));
      },
      members: async (roomId: string) => {
        if (!(await useHttp())) return mock.rooms.members(roomId);
        const rows = await apiFetch<RoomMember[]>(`/rooms/${roomId}/members`);
        return rows.map(mapRoomMember);
      },
      activityHeatmap: async (id: string) => {
        if (!(await useHttp())) return mock.rooms.activityHeatmap(id);
        return apiFetch(`/rooms/${id}/activity-heatmap`);
      },
      promote: async (id: string) => {
        if (!(await useHttp())) return mock.rooms.promote(id);
        return mapRoom(await apiFetch<Room>(`/rooms/${id}/promote`, { method: "POST" }));
      },
      delete: async (id: string) => {
        if (!(await useHttp())) return mock.rooms.delete(id);
        await apiFetch(`/rooms/${id}`, { method: "DELETE" });
      },
      acceptInvitation: async (roomId: string) => {
        if (!(await useHttp())) return mock.rooms.acceptInvitation(roomId);
        await apiFetch(`/rooms/${roomId}/members`, { method: "POST" });
        const room = await apiFetch<Room>(`/rooms/${roomId}`);
        return { ok: true, room: mapRoom(room), password_required_on_join: false };
      },
      rejectInvitation: async (roomId: string) => {
        if (!(await useHttp())) return mock.rooms.rejectInvitation(roomId);
        await apiFetch(`/rooms/${roomId}/invite/reject`, { method: "POST" });
        return { ok: true };
      },
      inviteMember: async (roomId: string, inviteeId: string) => {
        if (!(await useHttp())) return mock.rooms.inviteMember(roomId, inviteeId);
        await apiFetch(`/rooms/${roomId}/invite`, {
          method: "POST",
          body: JSON.stringify({ invitee_id: inviteeId }),
        });
        return { ok: true, invitee_display_name: inviteeId };
      },
      inviteMembers: async (roomId: string, inviteeIds: string[]) => {
        if (!(await useHttp())) return mock.rooms.inviteMembers(roomId, inviteeIds);
        const unique = [...new Set(inviteeIds.filter(Boolean))];
        const invited: { user_id: string; display_name: string }[] = [];
        const failed: { user_id: string; display_name: string; message: string }[] = [];
        for (const inviteeId of unique) {
          try {
            await apiFetch(`/rooms/${roomId}/invite`, {
              method: "POST",
              body: JSON.stringify({ invitee_id: inviteeId }),
            });
            invited.push({ user_id: inviteeId, display_name: inviteeId });
          } catch (err) {
            failed.push({
              user_id: inviteeId,
              display_name: inviteeId,
              message: err instanceof Error ? err.message : "초대 실패",
            });
          }
        }
        if (invited.length === 0) {
          throw new Error(failed[0]?.message ?? "초대에 실패했습니다");
        }
        return { ok: true, invited_count: invited.length, invited, failed };
      },
      listMyInvitations: async () => {
        if (!(await useHttp())) return mock.rooms.listMyInvitations();
        const rows = await apiFetch<RoomInvitationItem[]>("/rooms/invitations/me");
        return rows.map((row) => ({
          ...row,
          id: String(row.id),
          room_id: String(row.room_id),
        }));
      },
      getMeetingPurpose: async (roomId: string) => {
        if (!(await useHttp())) return mock.rooms.getMeetingPurpose(roomId);
        const room = mapRoom(await apiFetch<Room>(`/rooms/${roomId}`));
        return purposeFromRoom(room);
      },
      updateMeetingPurpose: async (roomId: string, data: MeetingPurposeSetting) => {
        if (!(await useHttp())) return mock.rooms.updateMeetingPurpose(roomId, data);
        const room = mapRoom(
          await apiFetch<Room>(`/rooms/${roomId}`, {
            method: "PATCH",
            body: JSON.stringify({
              meeting_purpose: data.purpose,
              meeting_purpose_custom: data.purpose_custom,
            }),
          })
        );
        return purposeFromRoom(room);
      },
      praiseStatus: async (roomId: string, appointmentId: string) => {
        if (!(await useHttp())) return mock.rooms.praiseStatus(roomId, appointmentId);
        return apiFetch(`/rooms/${roomId}/appointments/${appointmentId}/praise-status`);
      },
      submitPraise: async (roomId, appointmentId, data) => {
        if (!(await useHttp())) return mock.rooms.submitPraise(roomId, appointmentId, data);
        const res = await apiFetch<{ ok: boolean; points_awarded: number }>(
          `/rooms/${roomId}/appointments/${appointmentId}/praise-votes`,
          { method: "POST", body: JSON.stringify(data) }
        );
        return res;
      },
      travelReward: async (roomId, appointmentId, targetUserId) => {
        if (!(await useHttp())) return mock.rooms.travelReward(roomId, appointmentId, targetUserId);
        return apiFetch<{ ok: boolean; points_awarded: number }>(
          `/rooms/${roomId}/appointments/${appointmentId}/travel-reward`,
          { method: "POST", body: JSON.stringify({ target_user_id: targetUserId }) }
        );
      },
      getInviteLink: async (roomId: string) => {
        if (!(await useHttp())) return mock.rooms.getInviteLink(roomId);
        const raw = await apiFetch<InviteLinkInfo>(`/rooms/${roomId}/invite-link`);
        return { ...raw, room_id: String(raw.room_id) };
      },
      regenerateInviteLink: async (roomId: string) => {
        if (!(await useHttp())) return mock.rooms.regenerateInviteLink(roomId);
        const raw = await apiFetch<InviteLinkInfo>(`/rooms/${roomId}/invite-link/regenerate`, {
          method: "POST",
        });
        return { ...raw, room_id: String(raw.room_id) };
      },
      previewInviteToken: async (token: string) => {
        if (getApiMode() === "mock") return mock.rooms.previewInviteToken(token);
        const raw = await apiFetchPublic<InviteTokenPreview>(
          `/rooms/invite-links/${encodeURIComponent(token)}/preview`
        );
        return { ...raw, room_id: String(raw.room_id) };
      },
      joinByInviteToken: async (token: string) => {
        if (!(await useHttp())) return mock.rooms.joinByInviteToken(token);
        const room = mapRoom(
          await apiFetch<Room>(`/rooms/invite-links/${encodeURIComponent(token)}/join`, {
            method: "POST",
          })
        );
        return { ok: true, room };
      },
      previewJoin: async (roomId: string) => {
        if (!(await useHttp())) return mock.rooms.previewJoin(roomId);
        const raw = await apiFetch<JoinPreview>(`/rooms/${roomId}/join-preview`);
        return { ...raw, room_id: String(raw.room_id) };
      },
      joinWithPassword: async (roomId: string, password: string) => {
        if (!(await useHttp())) return mock.rooms.joinWithPassword(roomId, password);
        return mapRoom(
          await apiFetch<Room>(`/rooms/${roomId}/join-with-password`, {
            method: "POST",
            body: JSON.stringify({ password }),
          })
        );
      },
      listInviteCandidates: async (roomId: string) => {
        if (!(await useHttp())) return mock.rooms.listInviteCandidates(roomId);
        const rows = await apiFetch<FriendSummary[]>(`/rooms/${roomId}/invite-candidates`);
        return rows.map((r) => ({ user_id: String(r.user_id), display_name: r.display_name }));
      },
      setJoinPassword: async (roomId: string, password: string | null) => {
        if (!(await useHttp())) return mock.rooms.setJoinPassword(roomId, password);
        return apiFetch<{ ok: boolean; requires_join_password: boolean }>(
          `/rooms/${roomId}/join-password`,
          {
            method: "PUT",
            body: JSON.stringify({ password }),
          }
        );
      },
      hostTransferStatus: async (roomId: string) => {
        if (!(await useHttp())) return mock.rooms.hostTransferStatus(roomId);
        const raw = await apiFetch<HostTransferStatus>(`/rooms/${roomId}/host-transfer`);
        return {
          ...raw,
          owner_user_id: raw.owner_user_id ? String(raw.owner_user_id) : null,
          pending: raw.pending
            ? {
                ...raw.pending,
                from_user_id: String(raw.pending.from_user_id),
                to_user_id: String(raw.pending.to_user_id),
              }
            : null,
          transfer_candidates: raw.transfer_candidates.map((c) => ({
            user_id: String(c.user_id),
            display_name: c.display_name,
          })),
        };
      },
      requestHostTransfer: async (roomId: string, targetUserId: string) => {
        if (!(await useHttp())) return mock.rooms.requestHostTransfer(roomId, targetUserId);
        return apiFetch<{ ok: boolean }>(`/rooms/${roomId}/host-transfer`, {
          method: "POST",
          body: JSON.stringify({ target_user_id: targetUserId }),
        });
      },
      respondHostTransfer: async (roomId, accept, options) => {
        if (!(await useHttp())) return mock.rooms.respondHostTransfer(roomId, accept, options);
        return apiFetch<{ ok: boolean; accepted: boolean }>(
          `/rooms/${roomId}/host-transfer/respond`,
          { method: "POST", body: JSON.stringify({ accept }) }
        );
      },
      cancelHostTransfer: async (roomId: string) => {
        if (!(await useHttp())) return mock.rooms.cancelHostTransfer(roomId);
        return apiFetch<{ ok: boolean }>(`/rooms/${roomId}/host-transfer`, { method: "DELETE" });
      },
    },
    friends: {
      ...mock.friends,
      list: async () => {
        if (!(await useHttp())) return mock.friends.list();
        const rows = await apiFetch<FriendSummary[]>("/friends");
        return rows.map((r) => ({ user_id: String(r.user_id), display_name: r.display_name }));
      },
      add: async (friendId: string) => {
        if (!(await useHttp())) return mock.friends.add(friendId);
        const row = await apiFetch<FriendSummary>("/friends", {
          method: "POST",
          body: JSON.stringify({ friend_id: friendId }),
        });
        return { user_id: String(row.user_id), display_name: row.display_name };
      },
      remove: async (friendId: string) => {
        if (!(await useHttp())) return mock.friends.remove(friendId);
        await apiFetch(`/friends/${friendId}`, { method: "DELETE" });
        return { ok: true };
      },
    },
    teamSchedule: {
      ...mock.teamSchedule,
      listMonthMemos: async (roomId, year, month) => {
        if (!(await useHttp())) return mock.teamSchedule.listMonthMemos(roomId, year, month);
        const rows = await apiFetch<TeamScheduleDayMemo[]>(
          `/rooms/${roomId}/team-schedule/memos?year=${year}&month=${month}`
        );
        return rows.map((r) => ({
          ...r,
          id: String(r.id),
          room_id: String(r.room_id),
          user_id: String(r.user_id),
        }));
      },
      upsertDayMemo: async (roomId, scheduleDate, memo) => {
        if (!(await useHttp())) return mock.teamSchedule.upsertDayMemo(roomId, scheduleDate, memo);
        const row = await apiFetch<TeamScheduleDayMemo | null>(
          `/rooms/${roomId}/team-schedule/memos`,
          { method: "PUT", body: JSON.stringify({ schedule_date: scheduleDate, memo }) }
        );
        if (!row) return null;
        return {
          ...row,
          id: String(row.id),
          room_id: String(row.room_id),
          user_id: String(row.user_id),
        };
      },
      getWeekBoard: async (roomId, weekStart) => {
        if (!(await useHttp())) return mock.teamSchedule.getWeekBoard(roomId, weekStart);
        const q = weekStart ? `?week_start=${encodeURIComponent(weekStart)}` : "";
        const raw = await apiFetch<TeamScheduleWeekBoard>(
          `/rooms/${roomId}/team-schedule/week${q}`
        );
        return {
          ...raw,
          room_id: String(raw.room_id),
          members: raw.members.map((m) => ({ ...m, user_id: String(m.user_id) })),
        };
      },
      saveMyWeek: async (roomId, weekStart, slots, otherTimes) => {
        if (!(await useHttp())) return mock.teamSchedule.saveMyWeek(roomId, weekStart, slots, otherTimes);
        const raw = await apiFetch<TeamScheduleWeekBoard>(`/rooms/${roomId}/team-schedule/week`, {
          method: "PUT",
          body: JSON.stringify({ week_start: weekStart, slots, other_times: otherTimes }),
        });
        return {
          ...raw,
          room_id: String(raw.room_id),
          members: raw.members.map((m) => ({ ...m, user_id: String(m.user_id) })),
        };
      },
      getMilestones: async (roomId: string) => {
        if (!(await useHttp())) return mock.teamSchedule.getMilestones(roomId);
        return apiFetch<TeamMilestoneItem[]>(`/rooms/${roomId}/team-schedule/milestones`);
      },
      toggleMilestone: async (roomId: string, itemId: string) => {
        if (!(await useHttp())) return mock.teamSchedule.toggleMilestone(roomId, itemId);
        return apiFetch<TeamMilestoneItem[]>(
          `/rooms/${roomId}/team-schedule/milestones/${encodeURIComponent(itemId)}`,
          { method: "PATCH" }
        );
      },
    },
    places: {
      ...mock.places,
      list: async (roomId?: string) => {
        if (getApiMode() === "mock") return mock.places.list(roomId);
        const q = roomId ? `?room_id=${encodeURIComponent(roomId)}` : "";
        const rows = await apiFetchPublic<Place[]>(`/places${q}`);
        return rows.map(mapPlace);
      },
      create: async (data: PlaceCreate) => {
        if (!(await useHttp())) return mock.places.create(data);
        return mapPlace(
          await apiFetch<Place>("/places", { method: "POST", body: JSON.stringify(data) })
        );
      },
      rate: async (
        id: string,
        data: { rating: number; replace_place_id?: string; review?: string }
      ) => {
        if (!(await useHttp())) return mock.places.rate(id, data);
        await apiFetch(`/places/${id}/ratings`, {
          method: "POST",
          body: JSON.stringify({
            rating: data.rating,
            replace_place_id: data.replace_place_id,
            review: data.review,
          }),
        });
        return { ok: true };
      },
      listReviews: async (placeId: string) => {
        if (getApiMode() === "mock") return mock.places.listReviews(placeId);
        const data = await apiFetchPublic<PlaceReviewsResponse>(`/places/${placeId}/reviews`);
        return {
          ...data,
          place_id: String(data.place_id),
          reviews: data.reviews.map((r) => ({
            ...r,
            user_id: String(r.user_id),
          })),
        };
      },
      deleteReview: async (placeId: string, userId: string) => {
        if (!(await useHttp())) return mock.places.deleteReview(placeId, userId);
        await apiFetch(`/places/${placeId}/reviews/${userId}`, { method: "DELETE" });
        return { ok: true };
      },
      delete: async (id: string) => {
        if (!(await useHttp())) return mock.places.delete(id);
        await apiFetch(`/places/${id}`, { method: "DELETE" });
        return { ok: true };
      },
      voteRecommendation: async (id: string, vote: "RECOMMEND" | "NOT_RECOMMEND") => {
        if (!(await useHttp())) return mock.places.voteRecommendation(id, vote);
        await apiFetch(`/places/${id}/recommendation-votes`, {
          method: "POST",
          body: JSON.stringify({ vote_type: vote }),
        });
        return { ok: true, my_vote: vote };
      },
      get: async (id: string) => {
        if (!(await useHttp())) return mock.places.get(id);
        return mapPlace(await apiFetchPublic<Place>(`/places/${id}`));
      },
      travelTime: async (req: TravelTimeRequest) => {
        if (!(await useHttp())) return mock.places.travelTime(req);
        return apiFetch<TravelTimeResponse>("/places/travel-time", {
          method: "POST",
          body: JSON.stringify(req),
        });
      },
      travelRoute: async (req: TravelTimeRequest) => {
        if (!(await useHttp())) return mock.places.travelRoute(req);
        return apiFetch<TravelRouteResponse>("/places/travel-route", {
          method: "POST",
          body: JSON.stringify(req),
        });
      },
    },
    appointments: {
      ...mock.appointments,
      listMeetingMemories: async () => {
        if (!(await useHttp())) return mock.appointments.listMeetingMemories();
        const rows = await apiFetch<MeetingMemoryListItem[]>("/appointments/meeting-memories");
        return rows.map((r) => ({
          ...r,
          appointment_id: String(r.appointment_id),
          room_id: String(r.room_id),
          place_id: r.place_id ? String(r.place_id) : undefined,
        }));
      },
      listMeetingMemos: async (appointmentId: string) => {
        if (!(await useHttp())) return mock.appointments.listMeetingMemos(appointmentId);
        const rows = await apiFetch<MeetingMemoryMemoItem[]>(
          `/appointments/${appointmentId}/meeting-memos`
        );
        return rows.map((r) => ({
          ...r,
          user_id: String(r.user_id),
        }));
      },
      upsertMyMeetingMemo: async (appointmentId: string, body: string) => {
        if (!(await useHttp())) return mock.appointments.upsertMyMeetingMemo(appointmentId, body);
        const row = await apiFetch<MeetingMemoryMemoItem>(
          `/appointments/${appointmentId}/meeting-memos/me`,
          { method: "PUT", body: JSON.stringify({ body }) }
        );
        return { ...row, user_id: String(row.user_id) };
      },
      listByRoom: async (roomId: string) => {
        if (!(await useHttp())) return mock.appointments.listByRoom(roomId);
        const rows = await apiFetch<Appointment[]>(`/appointments/room/${roomId}`);
        return rows.map(mapAppointment);
      },
      create: async (data: AppointmentCreate) => {
        if (!(await useHttp())) return mock.appointments.create(data);
        return mapAppointment(
          await apiFetch<Appointment>("/appointments", {
            method: "POST",
            body: JSON.stringify(data),
          })
        );
      },
      get: async (id: string) => {
        if (!(await useHttp())) return mock.appointments.get(id);
        return mapAppointment(await apiFetch<Appointment>(`/appointments/${id}`));
      },
      submitDateVote: async (id: string, data: DateVote) => {
        if (!(await useHttp())) return mock.appointments.submitDateVote(id, data);
        await apiFetch(`/appointments/${id}/date-votes`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        return { ok: true };
      },
      dateSummary: async (id: string) => {
        if (!(await useHttp())) return mock.appointments.dateSummary(id);
        return apiFetch<VoteSummary[]>(`/appointments/${id}/date-votes/summary`);
      },
      advanceToTimeVote: async (id: string) => {
        if (!(await useHttp())) return mock.appointments.advanceToTimeVote(id);
        return apiFetch<{ status: string }>(`/appointments/${id}/advance-to-time-vote`, {
          method: "POST",
        });
      },
      submitTimeVote: async (id: string, data: TimeVote) => {
        if (!(await useHttp())) return mock.appointments.submitTimeVote(id, data);
        await apiFetch(`/appointments/${id}/time-votes`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        return { ok: true };
      },
      timeSummary: async (id: string) => {
        if (!(await useHttp())) return mock.appointments.timeSummary(id);
        return apiFetch<TimeSlotSummary[]>(`/appointments/${id}/time-votes/summary`);
      },
      confirm: async (id, voteDate, voteTime, placeId) => {
        if (!(await useHttp())) return mock.appointments.confirm(id, voteDate, voteTime, placeId);
        const params = new URLSearchParams({ vote_date: voteDate, vote_time: voteTime });
        if (placeId) params.set("place_id", placeId);
        return apiFetch<{ status: string; date: string; time: string }>(
          `/appointments/${id}/confirm?${params.toString()}`,
          { method: "POST" }
        );
      },
      briefing: async (id: string) => {
        if (!(await useHttp())) return mock.appointments.briefing(id);
        return apiFetch<AppointmentBriefing>(`/appointments/${id}/briefing`);
      },
      addComment: async (id: string, body: string) => {
        if (!(await useHttp())) return mock.appointments.addComment(id, body);
        const row = await apiFetch<AppointmentComment>(`/appointments/${id}/comments`, {
          method: "POST",
          body: JSON.stringify({ body }),
        });
        return { ...row, user_id: String(row.user_id) };
      },
      deleteComment: async (appointmentId: string, commentId: string) => {
        if (!(await useHttp())) return mock.appointments.deleteComment(appointmentId, commentId);
        await apiFetch(`/appointments/${appointmentId}/comments/${commentId}`, { method: "DELETE" });
        return { ok: true };
      },
      setDepartureStatus: async (id: string, status: DepartureStatus) => {
        if (!(await useHttp())) return mock.appointments.setDepartureStatus(id, status);
        await apiFetch(`/appointments/${id}/departure-status`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        return { ok: true };
      },
      settlement: async (id: string) => {
        if (!(await useHttp())) return mock.appointments.settlement(id);
        return apiFetch<MeetingSettlement>(`/appointments/${id}/settlement`);
      },
    },
    analytics: {
      recordVisit: async (data) => {
        if (getApiMode() === "mock") return mock.analytics.recordVisit(data);
        await apiFetchPublic("/analytics/visit", {
          method: "POST",
          headers: { "X-Visit-Session": data.sessionKey },
          body: JSON.stringify({
            path: data.path,
            session_key: data.sessionKey,
            user_agent: data.userAgent,
            referrer: data.referrer,
          }),
        });
      },
      todayCount: async () => {
        if (getApiMode() === "mock") return mock.analytics.todayCount();
        return apiFetchPublic<{ count: number; date: string }>("/analytics/today-count");
      },
      listVisits: async (params) => {
        if (getApiMode() === "mock") return mock.analytics.listVisits(params);
        const q = new URLSearchParams();
        if (params.dateFrom) q.set("date_from", params.dateFrom);
        if (params.dateTo) q.set("date_to", params.dateTo);
        if (params.browser) q.set("browser", params.browser);
        if (params.path) q.set("path", params.path);
        if (params.ip) q.set("ip", params.ip);
        if (params.limit != null) q.set("limit", String(params.limit));
        if (params.offset != null) q.set("offset", String(params.offset));
        const suffix = q.toString() ? `?${q.toString()}` : "";
        return apiFetch(`/analytics/visits${suffix}`);
      },
    },
  };
}
