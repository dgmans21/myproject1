"use client";

import { Menu, PanelLeft } from "lucide-react";
import { getPageMeta } from "@/lib/app-page-meta";

type AppContentHeaderProps = {
  pathname: string;
  onOpenMobileMenu: () => void;
  onExpandNavPanel?: () => void;
  navPanelCollapsed?: boolean;
};

export function AppContentHeader({
  pathname,
  onOpenMobileMenu,
  onExpandNavPanel,
  navPanelCollapsed,
}: AppContentHeaderProps) {
  const meta = getPageMeta(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface md:hidden"
        onClick={onOpenMobileMenu}
        aria-label="메뉴 열기"
      >
        <Menu className="h-5 w-5" />
      </button>

      {navPanelCollapsed && onExpandNavPanel && (
        <button
          type="button"
          className="hidden h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface md:flex"
          onClick={onExpandNavPanel}
          aria-label="사이드 메뉴 펼치기"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-foreground">{meta.title}</h1>
        {meta.description && (
          <p className="truncate text-xs text-muted">{meta.description}</p>
        )}
      </div>
    </header>
  );
}
