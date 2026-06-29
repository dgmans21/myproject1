"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, MapPin, Users, LogOut, Sparkles, UserCircle, Trophy, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
// import { createClient } from "@/lib/supabase/client"; // API 연동 시 복원

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: Sparkles },
  { href: "/groups", label: "방", icon: Users },
  { href: "/places", label: "맛집", icon: MapPin },
  { href: "/ranking", label: "랭킹", icon: Trophy },
  { href: "/profile", label: "마이페이지", icon: UserCircle },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    setMobileOpen(false);
    router.push("/");
  };

  const navLinkClass = (href: string) =>
    cn(
      "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
      pathname.startsWith(href)
        ? "bg-primary/10 text-primary"
        : "text-muted hover:bg-surface hover:text-foreground"
    );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <Calendar className="h-5 w-5" />
          </div>
          <span className="truncate text-lg font-bold tracking-tight text-foreground">
            우리지금만나
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={navLinkClass(href)}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleLogout}
            className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground sm:flex"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">로그아웃</span>
          </button>

          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border bg-card px-4 py-3 md:hidden">
          <ul className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={navLinkClass(href)}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
