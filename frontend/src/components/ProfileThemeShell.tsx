"use client";

import clsx from "clsx";
import type { ProfileDecorFields } from "@/lib/profile-decor-icons";
import { resolveProfileThemeStyle } from "@/lib/profile-theme";

interface ProfileThemeShellProps {
  decor?: ProfileDecorFields | null;
  className?: string;
  children: React.ReactNode;
}

/** DB에 저장된 theme_preset + accent_color로 프로필 카드 스타일 적용 */
export function ProfileThemeShell({ decor, className, children }: ProfileThemeShellProps) {
  const { className: themeClass, style, accent } = resolveProfileThemeStyle(decor);

  return (
    <div
      className={clsx("rounded-2xl border transition-colors", themeClass, className)}
      style={style}
      data-profile-theme={decor?.theme_preset ?? "default"}
      data-profile-accent={accent}
    >
      {children}
    </div>
  );
}
