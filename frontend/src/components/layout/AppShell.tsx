"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppIconRail } from "@/components/layout/AppIconRail";
import { AppNavPanel } from "@/components/layout/AppNavPanel";
import { AppContentHeader } from "@/components/layout/AppContentHeader";
import { AppMobileDrawer } from "@/components/layout/AppMobileDrawer";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/permissions";
import { useAuthSession } from "@/lib/use-auth-session";

const NAV_COLLAPSED_KEY = "app-nav-panel-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading, isGuest, isLoggedIn, needsLogin, login, logout } = useAuthSession();
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  useEffect(() => {
    try {
      setNavCollapsed(localStorage.getItem(NAV_COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (isLoading || needsLogin) {
      setUserIsAdmin(false);
      return;
    }
    api.profiles
      .me()
      .then((p) => setUserIsAdmin(isAdmin(p)))
      .catch(() => setUserIsAdmin(false));
  }, [isLoading, needsLogin]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleNavCollapsed = () => {
    setNavCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(NAV_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <AppIconRail
        isGuest={isGuest}
        isLoggedIn={isLoggedIn}
        profileLocked={needsLogin}
        onLogin={login}
        onLogout={logout}
        className="hidden md:flex"
      />

      <AppNavPanel
        collapsed={navCollapsed}
        onToggleCollapse={toggleNavCollapsed}
        isAdmin={userIsAdmin}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-card">
        <AppContentHeader
          pathname={pathname}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onExpandNavPanel={() => setNavCollapsed(false)}
          navPanelCollapsed={navCollapsed}
        />
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
      </div>

      <AppMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        isAdmin={userIsAdmin}
        isGuest={isGuest}
        isLoggedIn={isLoggedIn}
        profileLocked={needsLogin}
        onLogin={login}
        onLogout={logout}
      />
    </div>
  );
}
