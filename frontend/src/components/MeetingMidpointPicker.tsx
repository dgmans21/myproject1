"use client";

import { useEffect, useMemo, useState } from "react";
import { AddressInputWithDaumSearch } from "@/components/AddressInputWithDaumSearch";
import { KakaoMap, type KakaoMapCircle } from "@/components/KakaoMap";
import { Button } from "@/components/ui/Button";
import { api, type SavedLocation, type TravelTimeResponse } from "@/lib/api";
import { isGuestSession } from "@/lib/auth-session";
import {
  formatStraightDistance,
  haversineMeters,
  isStraightLineTravelEstimate,
  resolveMidpoint,
  type MidpointMode,
} from "@/lib/geo-midpoint";
import { findTravelFairMidpoint } from "@/lib/travel-fair-midpoint";
import { geocodeAddress, kakaoMapViewUrl } from "@/lib/kakao-map";
import { ChevronDown, ChevronUp, MapPin, Plus, Trash2 } from "lucide-react";

const MIN_POINTS = 3;
const MAX_POINTS = 5;
const MIDPOINT_RADIUS_M = 1000;

type MidpointSpot = {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  sourceKey?: string;
};

type PresetSpot = {
  sourceKey: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
};

function newId() {
  return `mp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** 새 약속 — 좌표 평균 / 거리 맞춤 / 이동시간 맞춤 + 반경 1km */
export function MeetingMidpointPicker() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<MidpointMode>("centroid");
  const [draft, setDraft] = useState("");
  const [spots, setSpots] = useState<MidpointSpot[]>([]);
  const [presets, setPresets] = useState<PresetSpot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [travelBySpot, setTravelBySpot] = useState<
    Record<string, TravelTimeResponse | "loading" | "error">
  >({});
  const [travelCenter, setTravelCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [travelOptimizing, setTravelOptimizing] = useState(false);
  const [travelOptError, setTravelOptError] = useState<string | null>(null);
  const [travelOptMeta, setTravelOptMeta] = useState<{ maxMinutes: number; maxKm: number } | null>(
    null
  );

  useEffect(() => {
    if (!open || isGuestSession()) return;
    let cancelled = false;
    (async () => {
      try {
        const [profile, saved] = await Promise.all([
          api.profiles.me(),
          api.savedLocations.list().catch(() => [] as SavedLocation[]),
        ]);
        if (cancelled) return;
        const next: PresetSpot[] = [];
        if (
          profile.home_lat != null &&
          profile.home_lng != null &&
          Number.isFinite(profile.home_lat) &&
          Number.isFinite(profile.home_lng)
        ) {
          next.push({
            sourceKey: "home",
            label: "집",
            address: profile.home_address || "집",
            lat: profile.home_lat,
            lng: profile.home_lng,
          });
        }
        for (const s of saved) {
          next.push({
            sourceKey: `saved:${s.id}`,
            label: s.label,
            address: s.address,
            lat: s.lat,
            lng: s.lng,
          });
        }
        setPresets(next);
      } catch {
        if (!cancelled) setPresets([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const spotsKey = useMemo(
    () => spots.map((s) => `${s.id}:${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join("|"),
    [spots]
  );

  const syncMidpoint = useMemo(
    () =>
      mode === "travel"
        ? null
        : resolveMidpoint(
            mode,
            spots.map((s) => ({ lat: s.lat, lng: s.lng }))
          ),
    [spots, mode]
  );

  useEffect(() => {
    if (mode !== "travel" || spots.length < MIN_POINTS) {
      setTravelCenter(null);
      setTravelOptimizing(false);
      setTravelOptError(null);
      setTravelOptMeta(null);
      return;
    }
    const signal = { cancelled: false };
    setTravelOptimizing(true);
    setTravelOptError(null);
    setTravelCenter(null);
    setTravelOptMeta(null);

    findTravelFairMidpoint(
      spots.map((s) => ({ lat: s.lat, lng: s.lng })),
      signal
    )
      .then((score) => {
        if (signal.cancelled) return;
        if (!score) {
          setTravelOptError("이동시간 맞춤 지점을 찾지 못했어요. 잠시 후 다시 시도해 주세요.");
          setTravelCenter(null);
          return;
        }
        setTravelCenter(score.center);
        setTravelOptMeta({ maxMinutes: score.maxMinutes, maxKm: score.maxKm });
      })
      .catch(() => {
        if (signal.cancelled) return;
        setTravelOptError("이동시간 조회에 실패했어요.");
      })
      .finally(() => {
        if (!signal.cancelled) setTravelOptimizing(false);
      });

    return () => {
      signal.cancelled = true;
    };
  }, [mode, spotsKey, spots.length]);

  const midpoint =
    mode === "travel" ? travelCenter : syncMidpoint;

  const readyMidpoint = Boolean(
    spots.length >= MIN_POINTS &&
      (mode === "travel" ? travelCenter && !travelOptimizing : syncMidpoint)
  );

  const midpointLabel =
    mode === "travel"
      ? "이동시간 맞춤 중간점"
      : mode === "fair"
        ? "거리 맞춤 중간점"
        : "좌표 평균 중간점";

  const markers = useMemo(() => {
    const list = spots.map((s) => ({
      id: s.id,
      name: s.label,
      lat: s.lat,
      lng: s.lng,
    }));
    if (readyMidpoint && midpoint) {
      list.push({
        id: "__midpoint__",
        name: midpointLabel,
        lat: midpoint.lat,
        lng: midpoint.lng,
      });
    }
    return list;
  }, [spots, midpoint, readyMidpoint, midpointLabel]);

  const circles: KakaoMapCircle[] = useMemo(() => {
    if (!readyMidpoint || !midpoint) return [];
    return [
      {
        id: "midpoint-1km",
        lat: midpoint.lat,
        lng: midpoint.lng,
        radiusMeters: MIDPOINT_RADIUS_M,
        strokeColor: "#0D9488",
        fillColor: "#14B8A6",
        fillOpacity: 0.14,
      },
    ];
  }, [readyMidpoint, midpoint]);

  const straightBySpot = useMemo(() => {
    if (!readyMidpoint || !midpoint) return {} as Record<string, number>;
    const next: Record<string, number> = {};
    for (const s of spots) {
      next[s.id] = haversineMeters(s, midpoint);
    }
    return next;
  }, [readyMidpoint, midpoint, spots]);

  useEffect(() => {
    if (!readyMidpoint || !midpoint) {
      setTravelBySpot({});
      return;
    }
    let cancelled = false;
    const loading: Record<string, TravelTimeResponse | "loading" | "error"> = {};
    for (const s of spots) loading[s.id] = "loading";
    setTravelBySpot(loading);

    (async () => {
      const entries = await Promise.all(
        spots.map(async (s) => {
          try {
            const res = await api.places.travelTime({
              origin_lat: s.lat,
              origin_lng: s.lng,
              dest_lat: midpoint.lat,
              dest_lng: midpoint.lng,
            });
            return [s.id, res] as const;
          } catch {
            return [s.id, "error" as const] as const;
          }
        })
      );
      if (cancelled) return;
      const next: Record<string, TravelTimeResponse | "loading" | "error"> = {};
      for (const [id, val] of entries) next[id] = val;
      setTravelBySpot(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [midpoint?.lat, midpoint?.lng, spots, readyMidpoint]);

  const travelModeHint = useMemo(() => {
    const vals = Object.values(travelBySpot).filter(
      (v): v is TravelTimeResponse => typeof v === "object" && v !== null
    );
    if (vals.length === 0) return null;
    if (vals.some((v) => isStraightLineTravelEstimate(v.route_summary))) {
      return "estimate" as const;
    }
    return "kakao" as const;
  }, [travelBySpot]);

  const travelImbalance = useMemo(() => {
    const vals = Object.values(travelBySpot).filter(
      (v): v is TravelTimeResponse => typeof v === "object" && v !== null
    );
    if (vals.length < 2) return null;
    const mins = vals.map((v) => v.duration_minutes);
    const kms = vals.map((v) => v.distance_meters / 1000);
    const minM = Math.min(...mins);
    const maxM = Math.max(...mins);
    const minKm = Math.min(...kms);
    const maxKm = Math.max(...kms);
    return {
      minM,
      maxM,
      minKm,
      maxKm,
      uneven: maxM - minM >= 8 || maxKm - minKm >= 5,
    };
  }, [travelBySpot]);

  const usedSourceKeys = useMemo(
    () => new Set(spots.map((s) => s.sourceKey).filter(Boolean) as string[]),
    [spots]
  );

  const addCoords = (spot: Omit<MidpointSpot, "id">): boolean => {
    if (spots.length >= MAX_POINTS) {
      setError(`출발지는 최대 ${MAX_POINTS}곳까지예요`);
      return false;
    }
    if (spot.sourceKey && usedSourceKeys.has(spot.sourceKey)) {
      setError("이미 추가된 장소예요");
      return false;
    }
    setError(null);
    setSpots((prev) => [...prev, { ...spot, id: newId() }]);
    return true;
  };

  const addFromPreset = (p: PresetSpot) => {
    addCoords({
      label: p.label,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      sourceKey: p.sourceKey,
    });
  };

  const addSpot = async () => {
    const address = draft.trim();
    if (!address) return;
    if (spots.length >= MAX_POINTS) {
      setError(`출발지는 최대 ${MAX_POINTS}곳까지예요`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const coords = await geocodeAddress(address);
      if (!coords) {
        setError("주소를 찾지 못했어요. 검색으로 다시 골라 주세요.");
        return;
      }
      const short = address.length > 28 ? `${address.slice(0, 28)}…` : address;
      const ok = addCoords({
        label: `출발 ${spots.length + 1}`,
        address: short,
        lat: coords.lat,
        lng: coords.lng,
      });
      if (ok) setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "주소 변환에 실패했어요");
    } finally {
      setBusy(false);
    }
  };

  const removeSpot = (id: string) => {
    setSpots((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/40 p-3">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            출발지 중간점 보기
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {open
              ? `좌표 평균 · 거리 맞춤 · 이동시간 맞춤을 비교할 수 있어요.`
              : readyMidpoint
                ? `출발 ${spots.length}곳 · 중간점·1km 표시 중`
                : "선택 · 집·회사 저장 장소와 같이 쓸 수 있어요"}
          </p>
        </div>
        {open ? (
          <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
        ) : (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
        )}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {presets.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted">내 저장 장소</p>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => {
                  const used = usedSourceKeys.has(p.sourceKey);
                  return (
                    <Button
                      key={p.sourceKey}
                      type="button"
                      size="sm"
                      variant={used ? "ghost" : "secondary"}
                      disabled={used || spots.length >= MAX_POINTS}
                      onClick={() => addFromPreset(p)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {p.label}
                      {used ? " · 추가됨" : ""}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {presets.length === 0 && !isGuestSession() && (
            <p className="text-xs text-muted">
              마이페이지에 집·회사 등을 저장해 두면 여기서 바로 고를 수 있어요.
            </p>
          )}

          <AddressInputWithDaumSearch
            label={`다른 주소 추가 (${spots.length}/${MAX_POINTS})`}
            value={draft}
            onChange={setDraft}
            placeholder="예: 서울 강남구 …"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={addSpot}
            disabled={busy || !draft.trim() || spots.length >= MAX_POINTS}
          >
            <Plus className="h-3.5 w-3.5" />
            {busy ? "찾는 중…" : "지도에 추가"}
          </Button>

          {error && <p className="text-sm text-warm">{error}</p>}

          {spots.length > 0 && (
            <ul className="space-y-2">
              {spots.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{s.label}</p>
                    <p className="truncate text-xs text-muted">{s.address}</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-muted hover:text-warm"
                    aria-label={`${s.label} 삭제`}
                    onClick={() => removeSpot(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {spots.length > 0 && spots.length < MIN_POINTS && (
            <p className="text-xs text-muted">
              중간점을 보려면 출발지를 {MIN_POINTS - spots.length}곳 더 넣어 주세요.
            </p>
          )}

          {spots.length >= MIN_POINTS && (
            <div className="space-y-3">
              <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
                <button
                  type="button"
                  onClick={() => setMode("centroid")}
                  className={`flex-1 rounded-md px-1.5 py-1.5 text-[11px] font-medium transition-colors sm:text-xs ${
                    mode === "centroid"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  좌표 평균
                </button>
                <button
                  type="button"
                  onClick={() => setMode("fair")}
                  className={`flex-1 rounded-md px-1.5 py-1.5 text-[11px] font-medium transition-colors sm:text-xs ${
                    mode === "fair"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  거리 맞춤
                </button>
                <button
                  type="button"
                  onClick={() => setMode("travel")}
                  className={`flex-1 rounded-md px-1.5 py-1.5 text-[11px] font-medium transition-colors sm:text-xs ${
                    mode === "travel"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  이동시간 맞춤
                </button>
              </div>

              {mode === "travel" && travelOptimizing && (
                <p className="rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted">
                  길찾기로 후보 지점을 비교하는 중이에요. 출발지가 많을수록 조금 더 걸려요…
                </p>
              )}

              {mode === "travel" && travelOptError && (
                <p className="rounded-lg bg-warm/10 px-3 py-2 text-sm text-warm">{travelOptError}</p>
              )}

              {readyMidpoint && midpoint && (
                <>
                  <div className="rounded-xl border border-border bg-card px-3 py-3 space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      ① {midpointLabel} (위치)
                    </p>
                    <p className="text-xs text-muted">
                      {mode === "centroid"
                        ? "좌표를 단순 평균한 점입니다. 지도 한가운데처럼 보이지만, 이동 km·분이 같아지지는 않아요."
                        : mode === "fair"
                          ? "직선 거리로 가장 먼 사람의 부담을 줄이도록 잡은 점입니다. 도로·한강 우회까지는 맞추지 못해요."
                          : "카카오 길찾기 기준으로 «가장 오래 걸리는 사람»의 시간이 가장 작은 후보를 골랐어요. 완벽히 같아지진 않을 수 있어요."}
                    </p>
                    {mode === "travel" && travelOptMeta && (
                      <p className="text-xs text-primary">
                        최악 예상 ≈ {travelOptMeta.maxMinutes}분 · {travelOptMeta.maxKm.toFixed(1)}
                        km
                      </p>
                    )}
                    <p className="text-xs text-foreground">
                      좌표 {midpoint.lat.toFixed(5)}, {midpoint.lng.toFixed(5)}
                    </p>
                    <ul className="space-y-1 text-xs text-muted">
                      {spots.map((s) => (
                        <li key={`straight-${s.id}`}>
                          {s.label} → 중간점 직선{" "}
                          {formatStraightDistance(straightBySpot[s.id] ?? 0)}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-accent">지도 원 = 중간점 반경 1km</p>
                  </div>

                  <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 space-y-2">
                    <p className="text-sm font-semibold text-foreground">② 실제 이동 (길찾기)</p>
                    <p className="text-xs text-muted">
                      {travelModeHint === "kakao"
                        ? "카카오 길찾기 기준 예상 시간·도로 거리입니다."
                        : travelModeHint === "estimate"
                          ? "길찾기 키를 쓰지 못해 직선 추정으로 표시 중이에요."
                          : "각 출발지에서 중간점까지 경로를 조회합니다."}
                    </p>
                    {travelImbalance?.uneven && mode !== "travel" && (
                      <p className="rounded-lg bg-warm/10 px-2.5 py-2 text-xs text-warm">
                        이동 부담 차이가 커요 (약 {travelImbalance.minKm.toFixed(1)}~
                        {travelImbalance.maxKm.toFixed(1)}km · {travelImbalance.minM}~
                        {travelImbalance.maxM}분). 「이동시간 맞춤」을 켜 보거나, 1km 원 안에서
                        장소를 고르는 게 나을 수 있어요.
                      </p>
                    )}
                    {travelImbalance?.uneven && mode === "travel" && (
                      <p className="rounded-lg bg-warm/10 px-2.5 py-2 text-xs text-warm">
                        후보 중 최선이어도 격차가 남아 있어요 (약 {travelImbalance.minKm.toFixed(1)}~
                        {travelImbalance.maxKm.toFixed(1)}km). 1km 원 안에서 장소를 고르면
                        더 나을 수 있어요.
                      </p>
                    )}
                    <ul className="space-y-1.5 text-xs">
                      {spots.map((s) => {
                        const travel = travelBySpot[s.id];
                        return (
                          <li key={`road-${s.id}`} className="text-foreground">
                            <span className="font-medium">{s.label}</span>
                            {travel === "loading" && (
                              <span className="ml-2 text-muted">계산 중…</span>
                            )}
                            {travel === "error" && (
                              <span className="ml-2 text-muted">조회 실패</span>
                            )}
                            {travel && travel !== "loading" && travel !== "error" && (
                              <span className="ml-2 text-primary">{travel.route_summary}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <a
                    href={kakaoMapViewUrl({
                      lat: midpoint.lat,
                      lng: midpoint.lng,
                      name: midpointLabel,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs text-primary hover:underline"
                  >
                    카카오맵에서 중간점 보기
                  </a>
                  <KakaoMap
                    markers={markers}
                    circles={circles}
                    center={midpoint}
                    level={6}
                    height={280}
                    useClusterer={false}
                    fitBounds={false}
                    recenterOnSelect={false}
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
