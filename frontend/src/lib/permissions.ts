import type { Profile } from "@/lib/api";
import { isGuestSession } from "@/lib/auth-session";

export type WriteAction =
  | "schedule_write"
  | "comment_write"
  | "review_write"
  | "room_manage"
  | "invite_manage";

export function isAdmin(profile: Pick<Profile, "role">): boolean {
  return profile.role === "ADMIN";
}

export function canWrite(profile: Pick<Profile, "role">): boolean {
  if (isGuestSession()) return false;
  return true;
}

export function canManageRoom(isOwner: boolean): boolean {
  return isOwner && !isGuestSession();
}

export function canDeleteRoom(
  isOwner: boolean,
  roomType: "ONE_TIME" | "REGULAR" | "TEAM_SCHEDULE"
): boolean {
  return canManageRoom(isOwner) && roomType === "ONE_TIME";
}

export function canModerateContent(profile: Pick<Profile, "role">): boolean {
  return isAdmin(profile);
}

export function canEditOwnContent(isAuthor: boolean, profile: Pick<Profile, "role">): boolean {
  if (isGuestSession()) return false;
  return isAuthor || isAdmin(profile);
}

export function canDeleteContent(
  isAuthor: boolean,
  profile: Pick<Profile, "role">
): boolean {
  if (isGuestSession()) return false;
  return isAuthor || isAdmin(profile);
}

export const WRITE_ACTION_LABELS: Record<WriteAction, string> = {
  schedule_write: "일정 작성",
  comment_write: "댓글 작성",
  review_write: "리뷰 등록",
  room_manage: "방 관리",
  invite_manage: "초대 링크 관리",
};
