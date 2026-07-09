"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  DepartureOrigin,
  useDepartureOrigin,
} from "@/lib/departure-origin-context";
import { keywordSearch } from "@/lib/kakao-map";
import { cn } from "@/lib/utils";
import { Loader2, MapPin, Search, X } from "lucide-react";
import Link from "next/link";

export function DepartureOriginPickerModal() {
  const {
    pickerOpen,
    closePicker,
    activeOrigin,
    home,
    savedLocations,
    selectHome,
    selectSaved,
    setSessionOrigin,
  } = useDepartureOrigin();

  const [tab, setTab] = useState<"saved" | "today">("saved");
  const [searchInput, setSearchInput] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; name: string; address: string; lat: number; lng: number }>
  >([]);

  useEffect(() => {
    if (!pickerOpen) {
      setTab("saved");
      setSearchInput("");
      setSearchResults([]);
      setSearchError(null);
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

  const pickSession = (row: { name: string; address: string; lat: number; lng: number }) => {
    const origin: DepartureOrigin = {
      lat: row.lat,
      lng: row.lng,
      name: row.name,
      source: "session",
    };
    setSessionOrigin(origin);
    closePicker();
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
            나의 주요 출발지
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

        <div className="flex border-b border-border text-sm">
          <button
            type="button"
            className={cn(
              "flex-1 py-2.5 font-medium",
              tab === "saved" ? "border-b-2 border-primary text-primary" : "text-muted"
            )}
            onClick={() => setTab("saved")}
          >
            저장된 장소
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 py-2.5 font-medium",
              tab === "today" ? "border-b-2 border-primary text-primary" : "text-muted"
            )}
            onClick={() => setTab("today")}
          >
            오늘만 다른 곳
          </button>
        </div>

        <div className="max-h-[50dvh] overflow-y-auto p-4">
          {tab === "saved" && (
            <ul className="space-y-2">
              {home ? (
                <li>
                  <button
                    type="button"
                    onClick={selectHome}
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
                </li>
              ) : (
                <li className="rounded-xl border border-dashed border-border p-3 text-sm text-muted">
                  집 주소가 없습니다.{" "}
                  <Link href="/profile" className="text-primary hover:underline" onClick={closePicker}>
                    마이페이지에서 설정
                  </Link>
                </li>
              )}
              {savedLocations.map((loc) => (
                <li key={loc.id}>
                  <button
                    type="button"
                    onClick={() => selectSaved(loc)}
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
              {savedLocations.length === 0 && home && (
                <p className="text-xs text-muted">
                  회사 등 추가 장소는{" "}
                  <Link href="/profile" className="text-primary hover:underline" onClick={closePicker}>
                    마이페이지
                  </Link>
                  에서 등록하세요.
                </p>
              )}
            </ul>
          )}

          {tab === "today" && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                오늘만 쓸 출발지입니다. 저장되지 않으며 새로고침 시 기본 출발지로 돌아갑니다.
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
              {searchError && <p className="text-xs text-accent">{searchError}</p>}
              <ul className="space-y-2">
                {searchResults.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => pickSession(row)}
                      className="w-full rounded-xl border border-border p-3 text-left hover:border-primary/30"
                    >
                      <p className="font-medium text-foreground">{row.name}</p>
                      <p className="mt-0.5 text-xs text-muted line-clamp-2">{row.address}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DepartureOriginChip({ className = "" }: { className?: string }) {
  const { activeOrigin, openPicker, loading, sessionOrigin } = useDepartureOrigin();

  if (loading) {
    return (
      <p className={cn("text-xs text-muted", className)}>출발지 불러오는 중…</p>
    );
  }

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
      {sessionOrigin?.source === "session" && (
        <span className="shrink-0 text-muted">(오늘만)</span>
      )}
    </button>
  );
}
