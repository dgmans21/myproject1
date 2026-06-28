import clsx from "clsx";
import type { ProfileDecorEntry, ProfileDecorFields } from "@/lib/profile-decor-icons";
import {
  getBloodTypeIcon,
  getChineseZodiacIcon,
  getWesternZodiacIcon,
} from "@/lib/profile-decor-icons";

interface ProfileDecorBadgesProps {
  decor?: ProfileDecorFields | null;
  size?: number;
  className?: string;
}

function DecorIcon({ entry, size }: { entry: ProfileDecorEntry; size: number }) {
  const Icon = entry.icon;
  return (
    <span title={entry.labelKo}>
      <Icon size={size} className={entry.tintClass} aria-hidden />
    </span>
  );
}

/** 닉네임 옆 인라인 꾸미기 아이콘 (MBTI 배지와 함께 멤버 목록 등에 표시) */
export function ProfileDecorBadges({ decor, size = 14, className }: ProfileDecorBadgesProps) {
  if (!decor) return null;

  const entries = [
    getChineseZodiacIcon(decor.chinese_zodiac),
    getWesternZodiacIcon(decor.western_zodiac),
    getBloodTypeIcon(decor.blood_type),
  ].filter(Boolean) as ProfileDecorEntry[];

  if (entries.length === 0) return null;

  return (
    <span className={clsx("inline-flex items-center gap-0.5", className)} aria-label="프로필 꾸미기">
      {entries.map((entry) => (
        <DecorIcon key={entry.id} entry={entry} size={size} />
      ))}
    </span>
  );
}
