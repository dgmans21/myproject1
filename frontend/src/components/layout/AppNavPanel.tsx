"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavSection } from "@/lib/app-nav-config";

type AppNavPanelProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  isAdmin?: boolean;
  onNavigate?: () => void;
  className?: string;
};

export function AppNavPanel({
  collapsed,
  onToggleCollapse,
  isAdmin = false,
  onNavigate,
  className,
}: AppNavPanelProps) {
  const pathname = usePathname();
  const section = getNavSection(pathname, isAdmin);

  return (
    <aside
      className={cn(
        "relative hidden shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 md:flex",
        collapsed ? "w-0 overflow-hidden border-r-0" : "w-60",
        className
      )}
    >
      <div className={cn("flex h-full w-60 flex-col", collapsed && "invisible")}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted">
            {section.title}
          </p>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-sidebar-hover hover:text-foreground"
            aria-label="메뉴 패널 접기"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-0.5">
            {section.links.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/groups" && pathname.startsWith(link.href));
              return (
                <li key={`${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    onClick={onNavigate}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/80 hover:bg-sidebar-hover hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute left-0 top-3 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card text-muted shadow-sm hover:text-foreground"
          aria-label="메뉴 패널 펼치기"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </aside>
  );
}
