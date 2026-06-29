"use client";

import { useMemo } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingDisplayProps {
  value: number;
  max?: number;
  size?: "sm" | "md";
  showNumeric?: boolean;
  className?: string;
}

function ratingColor(ratio: number): string {
  if (ratio >= 0.9) return "text-warm";
  if (ratio >= 0.7) return "text-amber-500";
  if (ratio >= 0.5) return "text-primary";
  return "text-muted";
}

function barColor(ratio: number): string {
  if (ratio >= 0.9) return "bg-warm";
  if (ratio >= 0.7) return "bg-amber-500";
  if (ratio >= 0.5) return "bg-primary";
  return "bg-muted";
}

/** 별 + 게이지로 평점 시각화 */
export function RatingDisplay({
  value,
  max = 5,
  size = "md",
  showNumeric = true,
  className,
}: RatingDisplayProps) {
  const ratio = Math.min(Math.max(value / max, 0), 1);
  const stars = useMemo(() => {
    return Array.from({ length: max }, (_, i) => {
      const threshold = i + 1;
      if (value >= threshold) return "full";
      if (value >= threshold - 0.5) return "half";
      return "empty";
    });
  }, [value, max]);

  const iconSize = size === "sm" ? 14 : 16;

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5" aria-hidden>
          {stars.map((state, i) => (
            <Star
              key={i}
              size={iconSize}
              className={cn(
                state === "full" && "fill-warm text-warm",
                state === "half" && "fill-warm/50 text-warm",
                state === "empty" && "text-border"
              )}
            />
          ))}
        </div>
        {showNumeric && (
          <span className={cn("font-semibold tabular-nums", ratingColor(ratio), size === "sm" ? "text-sm" : "text-base")}>
            {value.toFixed(1)}
            <span className="text-muted font-normal"> / {max}</span>
          </span>
        )}
      </div>
      <div
        className="h-1.5 w-full min-w-[4rem] max-w-[6rem] overflow-hidden rounded-full bg-border/60"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", barColor(ratio))}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
