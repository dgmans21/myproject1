"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, Profile, SavedLocation } from "@/lib/api";
import { isGuestSession } from "@/lib/auth-session";
import { useAuthSession } from "@/lib/use-auth-session";

export type DepartureOrigin = {
  lat: number;
  lng: number;
  name: string;
  source: "home" | "saved" | "session";
  id?: string;
};

type DepartureOriginContextValue = {
  activeOrigin: DepartureOrigin | null;
  home: DepartureOrigin | null;
  savedLocations: SavedLocation[];
  sessionOrigin: DepartureOrigin | null;
  loading: boolean;
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  selectHome: () => void;
  selectSaved: (loc: SavedLocation) => void;
  setSessionOrigin: (origin: DepartureOrigin | null) => void;
  refresh: () => Promise<void>;
};

const DepartureOriginContext = createContext<DepartureOriginContextValue | null>(null);

function homeOriginFromProfile(profile: Profile): DepartureOrigin | null {
  if (profile.home_lat == null || profile.home_lng == null) return null;
  return {
    lat: profile.home_lat,
    lng: profile.home_lng,
    name: profile.home_address || "집",
    source: "home",
  };
}

function defaultOrigin(
  home: DepartureOrigin | null,
  saved: SavedLocation[]
): DepartureOrigin | null {
  const def = saved.find((s) => s.is_default);
  if (def) {
    return {
      lat: def.lat,
      lng: def.lng,
      name: def.label,
      source: "saved",
      id: def.id,
    };
  }
  return home;
}

export function DepartureOriginProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, needsLogin } = useAuthSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [sessionOrigin, setSessionOrigin] = useState<DepartureOrigin | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (isGuestSession() || needsLogin) {
      setProfile(null);
      setSavedLocations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [p, saved] = await Promise.all([
        api.profiles.me(),
        api.savedLocations.list(),
      ]);
      setProfile(p);
      setSavedLocations(saved);
    } catch {
      setProfile(null);
      setSavedLocations([]);
    } finally {
      setLoading(false);
    }
  }, [needsLogin]);

  useEffect(() => {
    if (isLoading) return;
    void refresh();
  }, [isLoading, refresh]);

  const home = useMemo(
    () => (profile ? homeOriginFromProfile(profile) : null),
    [profile]
  );

  const defaultFromServer = useMemo(
    () => defaultOrigin(home, savedLocations),
    [home, savedLocations]
  );

  const activeOrigin = sessionOrigin ?? defaultFromServer;

  const selectHome = useCallback(() => {
    if (!home) return;
    setSessionOrigin(home);
    setPickerOpen(false);
  }, [home]);

  const selectSaved = useCallback((loc: SavedLocation) => {
    setSessionOrigin({
      lat: loc.lat,
      lng: loc.lng,
      name: loc.label,
      source: "saved",
      id: loc.id,
    });
    setPickerOpen(false);
  }, []);

  const value = useMemo<DepartureOriginContextValue>(
    () => ({
      activeOrigin,
      home,
      savedLocations,
      sessionOrigin,
      loading,
      pickerOpen,
      openPicker: () => setPickerOpen(true),
      closePicker: () => setPickerOpen(false),
      selectHome,
      selectSaved,
      setSessionOrigin,
      refresh,
    }),
    [
      activeOrigin,
      home,
      savedLocations,
      sessionOrigin,
      loading,
      pickerOpen,
      selectHome,
      selectSaved,
      refresh,
    ]
  );

  return (
    <DepartureOriginContext.Provider value={value}>{children}</DepartureOriginContext.Provider>
  );
}

export function useDepartureOrigin(): DepartureOriginContextValue {
  const ctx = useContext(DepartureOriginContext);
  if (!ctx) {
    throw new Error("useDepartureOrigin must be used within DepartureOriginProvider");
  }
  return ctx;
}

export function useDepartureOriginOptional(): DepartureOriginContextValue | null {
  return useContext(DepartureOriginContext);
}

export function resolveTravelOrigin(
  prop?: { lat: number; lng: number; name?: string },
  ctx?: DepartureOriginContextValue | null
): { lat: number; lng: number; name?: string } | undefined {
  if (prop) return prop;
  if (!ctx?.activeOrigin) return undefined;
  return {
    lat: ctx.activeOrigin.lat,
    lng: ctx.activeOrigin.lng,
    name: ctx.activeOrigin.name,
  };
}
