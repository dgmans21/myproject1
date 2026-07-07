"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Lock,
  LogIn,
  LogOut,
  MapPin,
  Sparkles,
  Trophy,
  UserCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_ICON_NAV } from "@/lib/app-nav-config";

const ICONS = [Sparkles, Users, MapPin, Trophy, UserCircle] as const;
const PROFILE_HREF = "/profile";

type AppIconRailProps = {
  isGuest: boolean;
  isLoggedIn: boolean;
  profileLocked: boolean;
  onLogin: () => void;
  onLogout: () => void | Promise<void>;
  onNavigate?: () => void;
  className?: string;
};

export function AppIconRail({
  isGuest,
  isLoggedIn,
  profileLocked,
  onLogin,
  onLogout,
  onNavigate,
  className,
}: AppIconRailProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "flex w-[72px] shrink-0 flex-col items-center border-r border-border bg-sidebar py-3",
        className
      )}
    >
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-sm transition-transform hover:scale-[1.02]"
        title="우리지금만나"
      >
        <Calendar className="h-6 w-6" />
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-2">
        {APP_ICON_NAV.map((item, idx) => {
          const Icon = item.href === PROFILE_HREF && profileLocked ? Lock : ICONS[idx];
          const active = isActive(item.href);
          const title =
            item.href === PROFILE_HREF && profileLocked
              ? `${item.label} (로그인 후 이용)`
              : item.label;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={title}
              className={cn(
                "group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-colors",
                active
                  ? "bg-primary text-white"
                  : profileLocked && item.href === PROFILE_HREF
                    ? "text-muted/70 hover:bg-sidebar-hover hover:text-muted"
                    : "text-muted hover:bg-sidebar-hover hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-xs text-white group-hover:block lg:group-hover:block">
                {title}
              </span>
            </Link>
          );
        })}
      </nav>

      {isLoggedIn && !isGuest ? (
        <button
          type="button"
          onClick={() => {
            void onLogout();
            onNavigate?.();
          }}
          title="로그아웃"
          className="mt-2 flex h-12 w-12 items-center justify-center rounded-2xl text-muted transition-colors hover:bg-sidebar-hover hover:text-foreground"
        >
          <LogOut className="h-5 w-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            onLogin();
            onNavigate?.();
          }}
          title="로그인"
          className="mt-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors hover:bg-primary/20"
        >
          <LogIn className="h-5 w-5" />
        </button>
      )}
    </aside>
  );
}
