"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, MapPin, Users, LogOut, Sparkles, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
// import { createClient } from "@/lib/supabase/client"; // API 연동 시 복원
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: Sparkles },
  { href: "/groups", label: "방", icon: Users },
  { href: "/places", label: "맛집", icon: MapPin },
  { href: "/profile", label: "마이페이지", icon: UserCircle },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    // API/Supabase 미연결: 로그아웃 없이 랜딩으로 이동
    router.push("/");

    // --- API 연동 시 아래 코드 복원 ---
    // const supabase = createClient();
    // await supabase.auth.signOut();
    // router.push("/");
    // router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
            <Calendar className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            우리지금만나
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-surface hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">로그아웃</span>
        </button>
      </div>
    </header>
  );
}
