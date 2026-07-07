"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearGuestSession, isGuestSession } from "@/lib/auth-session";

export type AuthSessionState = {
  isLoading: boolean;
  isGuest: boolean;
  isLoggedIn: boolean;
  /** 게스트이거나 Supabase 세션이 없을 때 */
  needsLogin: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function useAuthSession(): AuthSessionState {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const refresh = useCallback(async () => {
    const guest = isGuestSession();
    setIsGuest(guest);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsLoggedIn(Boolean(user));
    } catch {
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const login = useCallback(() => {
    clearGuestSession();
    router.push("/");
  }, [router]);

  const logout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearGuestSession();
    router.push("/");
  }, [router]);

  return {
    isLoading,
    isGuest,
    isLoggedIn,
    needsLogin: isGuest || !isLoggedIn,
    login,
    logout,
    refresh,
  };
}
