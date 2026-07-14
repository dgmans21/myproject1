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
  source: "home" | "saved" | "current";
  id?: string;
};

type DepartureOriginContextValue = {
  activeOrigin: DepartureOrigin | null;
  home: DepartureOrigin | null;
  savedLocations: SavedLocation[];
  currentDeparture: DepartureOrigin | null;
  loading: boolean;
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  selectHome: () => Promise<void>;
  selectSaved: (loc: SavedLocation) => Promise<void>;
  setCurrentDeparture: (origin: {
    lat: number;
    lng: number;
    name: string;
    address?: string;
  }) => Promise<void>;
  clearCurrentDeparture: () => Promise<void>;
  /** 집 주소 저장 후 출발지로 선택 */
  saveHomeAddress: (data: {
    address: string;
    lat: number;
    lng: number;
  }) => Promise<void>;
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

function currentDepartureFromProfile(profile: Profile): DepartureOrigin | null {
  if (profile.current_departure_lat == null || profile.current_departure_lng == null) {
    return null;
  }
  return {
    lat: profile.current_departure_lat,
    lng: profile.current_departure_lng,
    name:
      profile.current_departure_label ||
      profile.current_departure_address ||
      "현재 출발지",
    source: "current",
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

function coordsMatch(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): boolean {
  return Math.abs(a.lat - b.lat) < 1e-5 && Math.abs(a.lng - b.lng) < 1e-5;
}

export function DepartureOriginProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, needsLogin } = useAuthSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
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

  const currentDeparture = useMemo(
    () => (profile ? currentDepartureFromProfile(profile) : null),
    [profile]
  );

  const defaultFromServer = useMemo(
    () => defaultOrigin(home, savedLocations),
    [home, savedLocations]
  );

  const activeOrigin = currentDeparture ?? defaultFromServer;

  const patchProfile = useCallback(async (data: Partial<Profile>) => {
    const updated = await api.profiles.update(data);
    setProfile(updated);
  }, []);

  const clearCurrentDeparture = useCallback(async () => {
    await patchProfile({ clear_current_departure: true } as Partial<Profile>);
    setPickerOpen(false);
  }, [patchProfile]);

  const setCurrentDeparture = useCallback(
    async (origin: { lat: number; lng: number; name: string; address?: string }) => {
      await patchProfile({
        current_departure_label: origin.name,
        current_departure_address: origin.address,
        current_departure_lat: origin.lat,
        current_departure_lng: origin.lng,
      } as Partial<Profile>);
      setPickerOpen(false);
    },
    [patchProfile]
  );

  const selectHome = useCallback(async () => {
    if (!home) return;
    await setCurrentDeparture({
      lat: home.lat,
      lng: home.lng,
      name: home.name,
    });
  }, [home, setCurrentDeparture]);

  const selectSaved = useCallback(
    async (loc: SavedLocation) => {
      await setCurrentDeparture({
        lat: loc.lat,
        lng: loc.lng,
        name: loc.label,
        address: loc.address,
      });
    },
    [setCurrentDeparture]
  );

  const saveHomeAddress = useCallback(
    async (data: { address: string; lat: number; lng: number }) => {
      await patchProfile({
        home_address: data.address,
        home_lat: data.lat,
        home_lng: data.lng,
      });
      await setCurrentDeparture({
        lat: data.lat,
        lng: data.lng,
        name: data.address,
        address: data.address,
      });
    },
    [patchProfile, setCurrentDeparture]
  );

  const value = useMemo<DepartureOriginContextValue>(
    () => ({
      activeOrigin,
      home,
      savedLocations,
      currentDeparture,
      loading,
      pickerOpen,
      openPicker: () => setPickerOpen(true),
      closePicker: () => setPickerOpen(false),
      selectHome,
      selectSaved,
      setCurrentDeparture,
      clearCurrentDeparture,
      saveHomeAddress,
      refresh,
    }),
    [
      activeOrigin,
      home,
      savedLocations,
      currentDeparture,
      loading,
      pickerOpen,
      selectHome,
      selectSaved,
      setCurrentDeparture,
      clearCurrentDeparture,
      saveHomeAddress,
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

export function isActiveCurrentDeparture(
  active: DepartureOrigin | null,
  current: DepartureOrigin | null,
  defaultOriginVal: DepartureOrigin | null
): boolean {
  if (!active || !current) return false;
  if (!coordsMatch(active, current)) return false;
  if (defaultOriginVal && coordsMatch(current, defaultOriginVal)) return false;
  return true;
}
