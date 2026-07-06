"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppIconRail } from "@/components/layout/AppIconRail";
import { AppNavPanel } from "@/components/layout/AppNavPanel";
import { AppContentHeader } from "@/components/layout/AppContentHeader";
import { AppMobileDrawer } from "@/components/layout/AppMobileDrawer";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/permissions";

const NAV_COLLAPSED_KEY = "app-nav-panel-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
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
    api.profiles
      .me()
      .then((p) => setUserIsAdmin(isAdmin(p)))
      .catch(() => setUserIsAdmin(false));
  }, []);

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

  const handleLogout = () => {
    router.push("/");
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <AppIconRail onLogout={handleLogout} className="hidden md:flex" />

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
        onLogout={handleLogout}
      />
    </div>
  );
}
