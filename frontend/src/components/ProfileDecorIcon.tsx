"use client";

import clsx from "clsx";
import type { ProfileDecorEntry } from "@/lib/profile-decor-icons";

interface ProfileDecorIconProps {
  entry: ProfileDecorEntry;
  size?: number;
  className?: string;
  showLabel?: boolean;
}

/** 프로필 꾸미기 이모지 (마이페이지 미리보기 등) */
export function ProfileDecorIcon({
  entry,
  size = 20,
  className,
  showLabel = false,
}: ProfileDecorIconProps) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5", className)}>
      <span
        className="leading-none select-none"
        style={{ fontSize: size }}
        role="img"
        aria-label={entry.labelKo}
      >
        {entry.emoji}
      </span>
      {showLabel && <span className="text-sm text-foreground">{entry.labelKo}</span>}
    </span>
  );
}
