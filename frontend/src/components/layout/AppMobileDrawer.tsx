"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_ICON_NAV, getNavSection } from "@/lib/app-nav-config";
import {
  Sparkles,
  Users,
  MapPin,
  Trophy,
  UserCircle,
} from "lucide-react";

const ICONS = [Sparkles, Users, MapPin, Trophy, UserCircle] as const;

type AppMobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  onLogout: () => void;
};

export function AppMobileDrawer({ open, onClose, isAdmin = false, onLogout }: AppMobileDrawerProps) {
  const pathname = usePathname();
  const section = getNavSection(pathname, isAdmin);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="메뉴 닫기"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 left-0 flex w-[min(100%,280px)] bg-sidebar shadow-xl">
        <div className="flex w-[72px] shrink-0 flex-col items-center border-r border-border py-3">
          {APP_ICON_NAV.map((item, idx) => {
            const Icon = ICONS[idx];
            const active = pathname.startsWith(item.href) || (item.href === "/dashboard" && pathname === "/dashboard");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "mb-2 flex h-11 w-11 items-center justify-center rounded-xl",
                  active ? "bg-primary text-white" : "text-muted"
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{section.title}</p>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {section.links.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-sidebar-hover"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t border-border p-3">
            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-muted hover:bg-sidebar-hover"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
