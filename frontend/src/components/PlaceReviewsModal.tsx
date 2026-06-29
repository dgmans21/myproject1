"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MbtiBadge } from "@/components/MbtiBadge";
import { ProfileDecorBadges } from "@/components/ProfileDecorBadges";
import { RatingDisplay } from "@/components/RatingDisplay";
import { api, PlaceReviewItem, PlaceReviewsResponse, Profile } from "@/lib/api";
import { canDeleteContent } from "@/lib/permissions";
import { MessageSquare, Star, Trash2, X } from "lucide-react";

interface PlaceReviewsModalProps {
  open: boolean;
  placeId: string | null;
  placeName?: string;
  onClose: () => void;
  onChanged?: () => void;
}

function formatReviewDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/** 장소 리뷰 목록 — 페이지 이동 없이 모달 */
export function PlaceReviewsModal({
  open,
  placeId,
  placeName,
  onClose,
  onChanged,
}: PlaceReviewsModalProps) {
  const [data, setData] = useState<PlaceReviewsResponse | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = () => {
    if (!placeId) return;
    setLoading(true);
    api.places
      .listReviews(placeId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open || !placeId) {
      setData(null);
      return;
    }
    reload();
    api.profiles.me().then(setProfile).catch(() => {});
  }, [open, placeId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleDelete = async (review: PlaceReviewItem) => {
    if (!placeId || !profile) return;
    if (!confirm("이 리뷰를 삭제하시겠습니까?")) return;
    try {
      await api.places.deleteReview(placeId, review.user_id);
      reload();
      onChanged?.();
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    }
  };

  if (!open || !placeId) return null;

  const title = data?.place_name ?? placeName ?? "맛집";
  const withText = data?.reviews.filter((r) => r.review.trim()) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-border bg-background shadow-xl"
        role="dialog"
        aria-labelledby="place-reviews-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 id="place-reviews-title" className="text-base font-semibold text-foreground">
              {title}
            </h2>
            <p className="text-xs text-muted">
              {loading ? "불러오는 중…" : `리뷰 ${withText.length}개`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-surface hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted">리뷰를 불러오는 중…</p>
          ) : withText.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              <MessageSquare className="mx-auto h-8 w-8 opacity-40" />
              <p className="mt-2">아직 한줄 리뷰가 없습니다</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {withText.map((r) => (
                <li
                  key={r.user_id}
                  className="rounded-xl border border-border bg-surface/50 px-3 py-3"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-sm text-foreground inline-flex items-center gap-1">
                      {r.display_name}
                      <ProfileDecorBadges decor={r.profile_decor} />
                      {r.is_me && (
                        <span className="text-[10px] font-normal text-muted">(나)</span>
                      )}
                    </span>
                    <RatingDisplay value={r.rating} size="sm" showNumeric={false} />
                    {r.mbti_types?.map((t) => (
                      <MbtiBadge key={t} type={t} />
                    ))}
                    <span className="text-[10px] text-muted ml-auto">
                      {formatReviewDate(r.created_at)}
                    </span>
                    {profile && canDeleteContent(r.is_me, profile) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        className="text-muted hover:text-warm"
                        aria-label="리뷰 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-foreground leading-relaxed">{r.review}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-4 py-3">
          <Button variant="ghost" size="sm" className="w-full sm:w-auto" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
