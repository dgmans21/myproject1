"use client";

import { useEffect, useState } from "react";
import { AddressInputWithDaumSearch } from "@/components/AddressInputWithDaumSearch";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  isActiveCurrentDeparture,
  useDepartureOrigin,
} from "@/lib/departure-origin-context";
import { geocodeAddress, keywordSearch } from "@/lib/kakao-map";
import { cn } from "@/lib/utils";
import { Loader2, MapPin, Search, X } from "lucide-react";

export function DepartureOriginPickerModal() {
  const {
    pickerOpen,
    closePicker,
    activeOrigin,
    home,
    savedLocations,
    currentDeparture,
    selectHome,
    selectSaved,
    setCurrentDeparture,
    clearCurrentDeparture,
    saveHomeAddress,
  } = useDepartureOrigin();

  const [searchInput, setSearchInput] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; name: string; address: string; lat: number; lng: number }>
  >([]);

  const [homeQuery, setHomeQuery] = useState("");
  const [homeSaving, setHomeSaving] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);

  useEffect(() => {
    if (!pickerOpen) {
      setSearchInput("");
      setSearchResults([]);
      setSearchError(null);
      setHomeQuery("");
      setHomeError(null);
    }
  }, [pickerOpen]);

  if (!pickerOpen) return null;

  const runTodaySearch = async () => {
    const q = searchInput.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const page = await keywordSearch(q);
      setSearchResults(
        page.pois.map((p) => ({
          id: p.id,
          name: p.name,
          address: p.address,
          lat: p.lat,
          lng: p.lng,
        }))
      );
      if (page.pois.length === 0) {
        setSearchError("검색 결과가 없습니다");
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "검색 실패");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const pickOtherPlace = async (row: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  }) => {
    await setCurrentDeparture({
      lat: row.lat,
      lng: row.lng,
      name: row.name,
      address: row.address,
    });
  };

  const saveHome = async () => {
    const q = homeQuery.trim();
    if (!q) {
      setHomeError("집 주소를 입력해 주세요");
      return;
    }
    setHomeSaving(true);
    setHomeError(null);
    try {
      const coords = await geocodeAddress(q);
      if (!coords) {
        setHomeError("주소를 찾을 수 없습니다");
        return;
      }
      await saveHomeAddress({
        address: coords.name ?? q,
        lat: coords.lat,
        lng: coords.lng,
      });
    } catch (err) {
      setHomeError(err instanceof Error ? err.message : "집 주소 저장 실패");
    } finally {
      setHomeSaving(false);
    }
  };

  const isActive = (lat: number, lng: number) =>
    activeOrigin &&
    Math.abs(activeOrigin.lat - lat) < 1e-5 &&
    Math.abs(activeOrigin.lng - lng) < 1e-5;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="departure-picker-title"
    >
      <div className="max-h-[85dvh] w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="departure-picker-title" className="text-base font-semibold">
            나의 출발지
          </h2>
          <button
            type="button"
            onClick={closePicker}
            className="rounded-lg p-1 text-muted hover:bg-surface"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[55dvh] overflow-y-auto p-4 space-y-4">
          {home && (
            <section>
              <p className="mb-2 text-xs font-medium text-muted">집</p>
              <button
                type="button"
                onClick={() => void selectHome()}
                className={cn(
                  "w-full rounded-xl border p-3 text-left",
                  isActive(home.lat, home.lng)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <p className="font-medium text-foreground">집</p>
                <p className="mt-0.5 text-xs text-muted line-clamp-2">{home.name}</p>
              </button>
            </section>
          )}

          {!home && (
            <section className="rounded-xl border border-dashed border-border p-3 space-y-3">
              <p className="text-sm text-muted">집 주소가 없습니다. 여기서 바로 등록할 수 있습니다.</p>
              <AddressInputWithDaumSearch
                label="집 주소"
                value={homeQuery}
                onChange={setHomeQuery}
                placeholder="주소 검색"
              />
              {homeError && <p className="text-xs text-accent">{homeError}</p>}
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={homeSaving || !homeQuery.trim()}
                onClick={() => void saveHome()}
              >
                {homeSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> 저장 중…
                  </>
                ) : (
                  "집으로 저장하고 출발"
                )}
              </Button>
            </section>
          )}

          {savedLocations.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-medium text-muted">저장된 장소</p>
              <ul className="space-y-2">
                {savedLocations.map((loc) => (
                  <li key={loc.id}>
                    <button
                      type="button"
                      onClick={() => void selectSaved(loc)}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left",
                        isActive(loc.lat, loc.lng)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-foreground">{loc.label}</p>
                        {loc.is_default && (
                          <span className="text-xs text-primary">기본</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted line-clamp-2">{loc.address}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <p className="mb-2 text-xs font-medium text-muted">다른 곳에서 출발</p>
            <p className="mb-2 text-xs text-muted">
              검색한 출발지는 프로필에 저장되며, 확정·브리핑 이동시간에도 사용됩니다.
            </p>
            <div className="flex gap-2">
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void runTodaySearch();
                }}
                placeholder="건물명·상호 검색"
              />
              <Button type="button" size="sm" onClick={() => void runTodaySearch()} disabled={searchLoading}>
                {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {searchError && <p className="mt-2 text-xs text-accent">{searchError}</p>}
            <ul className="mt-2 space-y-2">
              {searchResults.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => void pickOtherPlace(row)}
                    className="w-full rounded-xl border border-border p-3 text-left hover:border-primary/30"
                  >
                    <p className="font-medium text-foreground">{row.name}</p>
                    <p className="mt-0.5 text-xs text-muted line-clamp-2">{row.address}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {currentDeparture && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => void clearCurrentDeparture()}
            >
              기본 출발지로 되돌리기
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DepartureOriginChip({ className = "" }: { className?: string }) {
  const { activeOrigin, openPicker, loading, currentDeparture, home, savedLocations } =
    useDepartureOrigin();

  const defaultSaved = savedLocations.find((s) => s.is_default) ?? null;
  const defaultOrigin = defaultSaved
    ? { lat: defaultSaved.lat, lng: defaultSaved.lng, name: defaultSaved.label }
    : home;

  if (loading) {
    return (
      <p className={cn("text-xs text-muted", className)}>출발지 불러오는 중…</p>
    );
  }

  const showCurrentBadge = isActiveCurrentDeparture(
    activeOrigin,
    currentDeparture,
    defaultOrigin
      ? { lat: defaultOrigin.lat, lng: defaultOrigin.lng, name: defaultOrigin.name, source: "home" }
      : null
  );

  return (
    <button
      type="button"
      onClick={openPicker}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left text-xs hover:border-primary/40",
        className
      )}
    >
      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="truncate text-foreground">
        출발: {activeOrigin?.name ?? "설정 필요"}
      </span>
      {showCurrentBadge && (
        <span className="shrink-0 text-muted">(지금)</span>
      )}
    </button>
  );
}
