import { getApiMode } from "@/lib/api-config";
import { apiFetch, apiFetchPublic, getAccessToken, getCurrentUserId } from "@/lib/api/http-client";
import { isGuestSession } from "@/lib/auth-session";
import type {
  Place,
  PlaceCreate,
  PlaceReviewsResponse,
  Profile,
  PublicProfileView,
  RankingEntry,
  RatingQuota,
  Room,
  RoomCreate,
  RoomMember,
} from "@/lib/api";

type MockApi = {
  profiles: {
    me: () => Promise<Profile>;
    get: (userId: string) => Promise<PublicProfileView>;
    ratingQuota: () => Promise<RatingQuota>;
    ranking: (limit?: number) => Promise<RankingEntry[]>;
    update: (data: Partial<Profile>) => Promise<Profile>;
    attendanceHeatmap: () => Promise<{ date: string; count: number }[]>;
    verifySecurity: (pin: string) => Promise<{ verified: boolean }>;
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
    voteRecommendation: (
      id: string,
      vote: "RECOMMEND" | "NOT_RECOMMEND"
    ) => Promise<{ ok: boolean; my_vote: "RECOMMEND" | "NOT_RECOMMEND" | null }>;
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
  };
}

function mapPlace(raw: Place): Place {
  return {
    ...raw,
    id: String(raw.id),
    avg_rating: Number(raw.avg_rating ?? 0),
    rating_count: Number(raw.rating_count ?? 0),
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
          room_type: data.room_type ?? "ONE_TIME",
          expire_date: data.expire_date,
          accent_color: data.accent_color,
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
    },
    places: {
      ...mock.places,
      list: async (roomId?: string) => {
        if (!(await useHttp())) return mock.places.list(roomId);
        const q = roomId ? `?room_id=${encodeURIComponent(roomId)}` : "";
        const rows = await apiFetch<Place[]>(`/places${q}`);
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
      voteRecommendation: async (id: string, vote: "RECOMMEND" | "NOT_RECOMMEND") => {
        if (!(await useHttp())) return mock.places.voteRecommendation(id, vote);
        await apiFetch(`/places/${id}/recommendation-votes`, {
          method: "POST",
          body: JSON.stringify({ vote_type: vote }),
        });
        return { ok: true, my_vote: vote };
      },
    },
  };
}
