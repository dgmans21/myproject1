"use client";

import { useEffect, useState } from "react";
import { ProfileSummaryCard } from "@/components/ProfileSummaryCard";
import { api, PublicProfileView } from "@/lib/api";
import { normalizeInterestEmojis } from "@/lib/profile-interests";
import { X } from "lucide-react";

interface UserProfileModalProps {
  open: boolean;
  userId: string | null;
  onClose: () => void;
}

/** 타인 프로필 — 방·리뷰 등에서 이름 탭 시 */
export function UserProfileModal({ open, userId, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<PublicProfileView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId) {
      setProfile(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    api.profiles
      .get(userId)
      .then(setProfile)
      .catch((e) => {
        setProfile(null);
        setError(e instanceof Error ? e.message : "프로필을 불러올 수 없습니다");
      })
      .finally(() => setLoading(false));
  }, [open, userId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const interestEmojis = normalizeInterestEmojis(profile?.profile_decor?.interest_emojis ?? []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="user-profile-title"
        className="flex max-h-[min(90vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-4 py-3">
          <h2 id="user-profile-title" className="text-lg font-semibold text-foreground">
            프로필
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="py-12 text-center text-sm text-muted">불러오는 중…</p>
          ) : error ? (
            <p className="py-12 text-center text-sm text-warm">{error}</p>
          ) : profile ? (
            <div className="space-y-4">
              <ProfileSummaryCard profile={profile} showRankingLink={profile.is_me} />
              {interestEmojis.length > 0 && (
                <div className="rounded-xl border border-border px-4 py-3">
                  <p className="text-xs font-medium text-muted">취미 · 관심</p>
                  <p className="mt-2 flex flex-wrap gap-1.5 text-xl">{interestEmojis.join(" ")}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
