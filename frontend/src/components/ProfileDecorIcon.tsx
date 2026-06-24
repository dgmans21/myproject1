"use client";

import clsx from "clsx";
import type { ProfileDecorEntry } from "@/lib/profile-decor-icons";

interface ProfileDecorIconProps {
  entry: ProfileDecorEntry;
  size?: number;
  className?: string;
  /** 아이콘 옆 한글 라벨 */
  showLabel?: boolean;
}

/** 마이페이지 꾸미기 전용 — 외부 공개 UI에서는 사용하지 않음 */
export function ProfileDecorIcon({
  entry,
  size = 20,
  className,
  showLabel = false,
}: ProfileDecorIconProps) {
  const Icon = entry.icon;
  return (
    <span className={clsx("inline-flex items-center gap-1.5", className)}>
      <Icon size={size} className={entry.tintClass} aria-hidden />
      {showLabel && <span className="text-sm text-foreground">{entry.labelKo}</span>}
    </span>
  );
}
