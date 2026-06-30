"use client";

import { formatPlaceRating, PLACE_RATING_OPTIONS } from "@/lib/place-ratings";
import { cn } from "@/lib/utils";

const STANDARD_RATINGS = PLACE_RATING_OPTIONS.filter((r) => r < 4.5);
const PREMIUM_RATINGS = [4.5, 5] as const;

interface PlaceRatingPickerProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

function ratingButtonClass(r: number, selected: boolean): string {
  const isPremium = r === 4.5 || r === 5;

  if (selected && isPremium) {
    return cn(
      "border-warm bg-gradient-to-br from-warm to-amber-500 text-white font-bold shadow-md",
      "ring-2 ring-warm/35 scale-[1.06]",
      r === 5 && "shadow-warm/25 shadow-lg"
    );
  }

  if (selected) {
    return "border-primary/40 bg-primary/10 text-primary font-semibold ring-1 ring-primary/20";
  }

  if (isPremium) {
    return cn(
      "border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      "hover:border-warm/60 hover:bg-warm/15",
      r === 5 && "ring-1 ring-warm/25"
    );
  }

  return "border-border text-muted hover:border-primary/30 hover:bg-surface hover:text-foreground";
}

/** 맛집 별점 선택 — 4.5·5점은 한도 구간으로 분리·강조 */
export function PlaceRatingPicker({ value, onChange, className }: PlaceRatingPickerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-xs space-y-3 text-center", className)}>
      <div className="grid grid-cols-4 gap-2">
        {STANDARD_RATINGS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            aria-pressed={value === r}
            className={cn(
              "rounded-xl border px-2 py-2 text-sm tabular-nums transition-all",
              ratingButtonClass(r, value === r)
            )}
          >
            {formatPlaceRating(r)}
          </button>
        ))}
      </div>

      <div className="border-t border-border/70 pt-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">
          한도 별점
        </p>
        <div className="flex justify-center gap-3">
          {PREMIUM_RATINGS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onChange(r)}
              aria-pressed={value === r}
              className={cn(
                "min-w-[3.25rem] rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-all",
                ratingButtonClass(r, value === r)
              )}
            >
              {formatPlaceRating(r)}
              <span className="mt-0.5 block text-[10px] font-normal opacity-80">
                {r === 5 ? "평생 5곳" : "월 5회"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
