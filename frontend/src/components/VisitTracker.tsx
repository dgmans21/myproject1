"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { getVisitSessionKey } from "@/lib/visit-session";

/** 페이지 방문 1건 기록 (익명 session_key + optional 로그인 user) */
export function VisitTracker() {
  const pathname = usePathname();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    const key = `${pathname}`;
    if (lastKey.current === key) return;
    lastKey.current = key;

    const sessionKey = getVisitSessionKey();
    api.analytics
      .recordVisit({
        path: pathname,
        sessionKey,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      })
      .catch(() => {});
  }, [pathname]);

  return null;
}
