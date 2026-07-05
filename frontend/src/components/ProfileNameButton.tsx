"use client";

import { useState } from "react";
import { UserProfileModal } from "@/components/UserProfileModal";
import { cn } from "@/lib/utils";

interface ProfileNameButtonProps {
  userId: string;
  displayName: string;
  className?: string;
  /** false면 모달 없이 텍스트만 (본인 "(나)" 등) */
  interactive?: boolean;
}

/** 멤버·리뷰 작성자 이름 — 탭하면 프로필 모달 */
export function ProfileNameButton({
  userId,
  displayName,
  className,
  interactive = true,
}: ProfileNameButtonProps) {
  const [open, setOpen] = useState(false);

  if (!interactive) {
    return <span className={className}>{displayName}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "font-medium text-foreground underline-offset-2 hover:text-primary hover:underline",
          className
        )}
      >
        {displayName}
      </button>
      <UserProfileModal open={open} userId={userId} onClose={() => setOpen(false)} />
    </>
  );
}
