"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Place, TIER_LABELS } from "@/lib/api";
import { KakaoPoiResult } from "@/lib/kakao-map";
import { findPlaceByKakaoId } from "@/lib/place-kakao-match";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

export type KakaoPoiResultListVariant = "register" | "map";

export function KakaoPoiResultList({
  results,
  placeByKakaoId,
  selectedPoiId,
  variant,
  onSelect,
  onViewReviews,
  className,
  title = "검색 결과",
}: {
  results: KakaoPoiResult[];
  placeByKakaoId: Map<string, Place>;
  selectedPoiId: string | null;
  variant: KakaoPoiResultListVariant;
  onSelect: (poi: KakaoPoiResult) => void;
  onViewReviews?: (place: Place) => void;
  className?: string;
  title?: string;
}) {
  if (results.length === 0) return null;

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)}>
      <p className="text-sm font-semibold text-foreground">
        {title} ({results.length})
      </p>
      <ul className="min-h-0 space-y-2 overflow-y-auto rounded-xl border border-border p-2">
        {results.map((poi) => {
          const matched = findPlaceByKakaoId(placeByKakaoId, poi.id);
          const active = selectedPoiId === poi.id;
          const disableSelect = variant === "register" && Boolean(matched);

          return (
            <li key={poi.id}>
              <button
                type="button"
                disabled={disableSelect}
                onClick={() => onSelect(poi)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  disableSelect
                    ? "cursor-not-allowed border-border bg-surface opacity-80"
                    : active
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-card hover:border-primary/30"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{poi.name}</p>
                  {matched && (
                    <Badge variant="tier" tier={matched.tier}>
                      {variant === "register" ? "이미 등록된 맛집입니다" : "등록된 맛집"}
                    </Badge>
                  )}
                  {active && !disableSelect && (
                    <span className="text-xs font-medium text-primary">선택됨</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted">{poi.address}</p>
                {matched && variant === "register" && onViewReviews && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewReviews(matched);
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> 기존 리뷰 보기
                  </Button>
                )}
                {matched && variant === "map" && (
                  <p className="mt-1 text-xs text-muted">
                    {TIER_LABELS[matched.tier]} · 평균 {matched.avg_rating.toFixed(1)}점
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
