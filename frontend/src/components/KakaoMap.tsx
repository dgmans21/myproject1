"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_MAP_CENTER,
  KakaoMapMarker,
  loadKakaoMapSdk,
} from "@/lib/kakao-map";

export interface KakaoMapHandle {
  getCenter: () => { lat: number; lng: number } | null;
  getLevel: () => number | null;
}

export interface KakaoMapPolyline {
  id: string;
  points: Array<{ lat: number; lng: number }>;
  strokeColor?: string;
  strokeWeight?: number;
  strokeOpacity?: number;
}

interface KakaoMapProps {
  markers?: KakaoMapMarker[];
  /** 출발지→후보 경로선 (카카오 길찾기 폴리라인). ENABLE_DEPARTURE_ROUTE_LINES 참고 */
  polylines?: KakaoMapPolyline[];
  center?: { lat: number; lng: number };
  level?: number;
  height?: number | string;
  className?: string;
  selectedMarkerId?: string | null;
  onMarkerClick?: (id: string) => void;
  /** 다중 마커일 때 clusterer 라이브러리 사용 (공식 가이드) */
  useClusterer?: boolean;
  /** false면 마커 기준 bounds 자동 맞춤 비활성 (검색 모드) */
  fitBounds?: boolean;
  /** false면 선택 마커 시 center 이동 안 함 */
  recenterOnSelect?: boolean;
  mapHandleRef?: React.MutableRefObject<KakaoMapHandle | null>;
  overlay?: React.ReactNode;
  onCenterChanged?: (center: { lat: number; lng: number }) => void;
}

export function KakaoMap({
  markers = [],
  polylines = [],
  center,
  level = 5,
  height = 400,
  className = "",
  selectedMarkerId,
  onMarkerClick,
  useClusterer = true,
  fitBounds = true,
  recenterOnSelect = true,
  mapHandleRef,
  overlay,
  onCenterChanged,
}: KakaoMapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const clustererRef = useRef<unknown>(null);
  const markerInstancesRef = useRef<unknown[]>([]);
  const polylineInstancesRef = useRef<unknown[]>([]);
  const initialLevelRef = useRef(level);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initialLevelRef.current = level;
  }, [level]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    loadKakaoMapSdk()
      .then(() => {
        if (cancelled || !containerRef.current || !window.kakao) return;

        const kakao = window.kakao.maps;
        const mapCenter = center
          ? new kakao.LatLng(center.lat, center.lng)
          : new kakao.LatLng(DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng);

        const map = new kakao.Map(containerRef.current, {
          center: mapCenter,
          level: initialLevelRef.current,
        });
        mapRef.current = map;
        setReady(true);
        setError(null);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
      markerInstancesRef.current.forEach((m) => {
        (m as { setMap: (v: null) => void }).setMap(null);
      });
      markerInstancesRef.current = [];
      polylineInstancesRef.current.forEach((p) => {
        (p as { setMap: (v: null) => void }).setMap(null);
      });
      polylineInstancesRef.current = [];
      if (clustererRef.current) {
        (clustererRef.current as { clear: () => void }).clear();
        clustererRef.current = null;
      }
      mapRef.current = null;
      if (mapHandleRef) mapHandleRef.current = null;
    };
  }, [mapHandleRef]);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.kakao || !center) return;
    const kakao = window.kakao.maps;
    const map = mapRef.current as {
      setCenter: (c: unknown) => void;
      setLevel: (l: number) => void;
    };
    map.setCenter(new kakao.LatLng(center.lat, center.lng));
    if (level != null) map.setLevel(level);
  }, [ready, center?.lat, center?.lng, level]);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.kakao) return;

    const kakao = window.kakao.maps;
    const map = mapRef.current;

    markerInstancesRef.current.forEach((m) => {
      (m as { setMap: (v: null) => void }).setMap(null);
    });
    markerInstancesRef.current = [];

    if (clustererRef.current) {
      (clustererRef.current as { clear: () => void }).clear();
      clustererRef.current = null;
    }

    if (markers.length === 0) return;

    const created = markers.map((m) => {
      const position = new kakao.LatLng(m.lat, m.lng);
      const marker = new kakao.Marker({
        position,
        title: m.name,
      });

      if (onMarkerClick) {
        kakao.event.addListener(marker, "click", () => onMarkerClick(m.id));
      }

      return marker;
    });

    markerInstancesRef.current = created;

    const shouldCluster = useClusterer && markers.length > 1;

    if (shouldCluster) {
      const clusterer = new kakao.MarkerClusterer({
        map,
        averageCenter: true,
        minLevel: 10,
        markers: created,
      });
      clustererRef.current = clusterer;
    } else {
      created.forEach((marker) => {
        (marker as { setMap: (v: unknown) => void }).setMap(map);
      });
    }

    if (fitBounds) {
      const bounds = new kakao.LatLngBounds();
      markers.forEach((m) => bounds.extend(new kakao.LatLng(m.lat, m.lng)));
      (map as { setBounds: (b: unknown) => void }).setBounds(bounds);
    }

    if (recenterOnSelect && selectedMarkerId) {
      const selected = markers.find((m) => m.id === selectedMarkerId);
      if (selected) {
        (map as { setCenter: (c: unknown) => void; setLevel: (l: number) => void }).setCenter(
          new kakao.LatLng(selected.lat, selected.lng)
        );
        (map as { setLevel: (l: number) => void }).setLevel(3);
      }
    }
  }, [
    ready,
    markers,
    selectedMarkerId,
    onMarkerClick,
    useClusterer,
    fitBounds,
    recenterOnSelect,
  ]);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.kakao) return;

    const kakao = window.kakao.maps;
    const map = mapRef.current;

    polylineInstancesRef.current.forEach((p) => {
      (p as { setMap: (v: null) => void }).setMap(null);
    });
    polylineInstancesRef.current = [];

    if (polylines.length === 0) return;

    const createdPolylines = polylines
      .filter((line) => line.points.length >= 2)
      .map((line) => {
        const path = line.points.map((pt) => new kakao.LatLng(pt.lat, pt.lng));
        const polyline = new kakao.Polyline({
          path,
          strokeWeight: line.strokeWeight ?? 4,
          strokeColor: line.strokeColor ?? "#6366F1",
          strokeOpacity: line.strokeOpacity ?? 0.75,
          strokeStyle: "solid",
        });
        polyline.setMap(map);
        return polyline;
      });

    polylineInstancesRef.current = createdPolylines;
  }, [ready, polylines]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const map = mapRef.current as {
      relayout?: () => void;
      getCenter: () => { getLat: () => number; getLng: () => number };
      getLevel: () => number;
    };

    if (mapHandleRef) {
      mapHandleRef.current = {
        getCenter: () => {
          const c = map.getCenter();
          return { lat: c.getLat(), lng: c.getLng() };
        },
        getLevel: () => map.getLevel(),
      };
    }
  }, [ready, mapHandleRef]);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.kakao || !onCenterChanged) return;

    const map = mapRef.current as {
      getCenter: () => { getLat: () => number; getLng: () => number };
    };
    const kakao = window.kakao.maps;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const emitCenter = () => {
      const c = map.getCenter();
      onCenterChanged({ lat: c.getLat(), lng: c.getLng() });
    };

    const scheduleEmit = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(emitCenter, 200);
    };

    kakao.event.addListener(map, "center_changed", scheduleEmit);
    kakao.event.addListener(map, "zoom_changed", scheduleEmit);

    emitCenter();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      kakao.event.removeListener(map, "center_changed", scheduleEmit);
      kakao.event.removeListener(map, "zoom_changed", scheduleEmit);
    };
  }, [ready, onCenterChanged]);

  useEffect(() => {
    if (!ready || !mapRef.current || !wrapperRef.current) return;

    const map = mapRef.current as { relayout?: () => void };
    const relayout = () => {
      map.relayout?.();
    };

    relayout();

    const observer = new ResizeObserver(() => {
      relayout();
    });
    observer.observe(wrapperRef.current);

    return () => {
      observer.disconnect();
    };
  }, [ready]);

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full overflow-hidden rounded-2xl border border-border ${className}`}
      style={{ height }}
    >
      <div
        ref={containerRef}
        className="h-full w-full"
        aria-label="Kakao 지도"
        aria-busy={!ready && !error}
      />

      {overlay}

      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface text-sm text-muted">
          지도 불러오는 중...
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 border border-dashed border-border bg-surface px-4 text-center text-sm text-muted">
          <p className="font-medium text-foreground">지도를 불러올 수 없습니다</p>
          <p>잠시 후 다시 시도해 주세요.</p>
          {process.env.NODE_ENV === "development" && (
            <p className="mt-1 max-w-sm text-xs text-accent">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
