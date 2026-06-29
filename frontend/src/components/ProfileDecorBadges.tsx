import clsx from "clsx";
import type { ProfileDecorFields } from "@/lib/profile-decor-icons";
import {
  listProfileDecorDisplayItems,
  MEMBER_DECOR_DISPLAY_LIMIT,
  profileDecorEmojis,
} from "@/lib/profile-decor-icons";

interface ProfileDecorBadgesProps {
  decor?: ProfileDecorFields | null;
  size?: number;
  className?: string;
  /** 표시 개수 상한 (방 멤버 목록 등). 미설정 시 전부 표시 */
  maxItems?: number;
}

/** 닉네임 옆 인라인 꾸미기 이모지 (표현 + 취미·관심) */
export function ProfileDecorBadges({
  decor,
  size = 16,
  className,
  maxItems,
}: ProfileDecorBadgesProps) {
  if (!decor) return null;

  const allItems = listProfileDecorDisplayItems(decor);
  if (allItems.length === 0) return null;

  const limit = maxItems ?? allItems.length;
  const visible = allItems.slice(0, limit);
  const hiddenCount = allItems.length - visible.length;

  return (
    <span
      className={clsx(
        "inline-flex max-w-full min-w-0 items-center gap-0.5 leading-none",
        maxItems != null && "flex-wrap",
        className
      )}
      aria-label={`프로필 꾸미기: ${allItems.map((item) => item.label).join(", ")}${
        hiddenCount > 0 ? ` 외 ${hiddenCount}개` : ""
      }`}
    >
      {visible.map((item) => (
        <span
          key={item.key}
          style={{ fontSize: size }}
          className="select-none shrink-0"
          title={item.label}
          role="img"
          aria-label={item.label}
        >
          {item.emoji}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span
          className="shrink-0 text-[10px] font-medium text-muted"
          title={`${allItems.slice(limit).map((item) => item.emoji).join(" ")}`}
        >
          +{hiddenCount}
        </span>
      )}
    </span>
  );
}

/** 전체 이모지 목록 (미리보기 등) */
export function profileDecorEmojiList(decor?: ProfileDecorFields | null): string[] {
  return profileDecorEmojis(decor);
}

export { MEMBER_DECOR_DISPLAY_LIMIT };
