"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_MAP_CENTER,
  KakaoMapMarker,
  loadKakaoMapSdk,
} from "@/lib/kakao-map";

interface KakaoMapProps {
  markers?: KakaoMapMarker[];
  center?: { lat: number; lng: number };
  level?: number;
  height?: number | string;
  className?: string;
  selectedMarkerId?: string | null;
  onMarkerClick?: (id: string) => void;
  /** 다중 마커일 때 clusterer 라이브러리 사용 (공식 가이드) */
  useClusterer?: boolean;
}

export function KakaoMap({
  markers = [],
  center,
  level = 5,
  height = 400,
  className = "",
  selectedMarkerId,
  onMarkerClick,
  useClusterer = true,
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const clustererRef = useRef<unknown>(null);
  const markerInstancesRef = useRef<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

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
          level,
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
      if (clustererRef.current) {
        (clustererRef.current as { clear: () => void }).clear();
        clustererRef.current = null;
      }
      mapRef.current = null;
    };
  }, [center?.lat, center?.lng, level]);

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

    const bounds = new kakao.LatLngBounds();
    markers.forEach((m) => bounds.extend(new kakao.LatLng(m.lat, m.lng)));
    (map as { setBounds: (b: unknown) => void }).setBounds(bounds);

    if (selectedMarkerId) {
      const selected = markers.find((m) => m.id === selectedMarkerId);
      if (selected) {
        (map as { setCenter: (c: unknown) => void; setLevel: (l: number) => void }).setCenter(
          new kakao.LatLng(selected.lat, selected.lng)
        );
        (map as { setLevel: (l: number) => void }).setLevel(3);
      }
    }
  }, [ready, markers, selectedMarkerId, onMarkerClick, useClusterer]);


  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-border ${className}`}
      style={{ height }}
    >
      <div
        ref={containerRef}
        className="h-full w-full"
        aria-label="Kakao 지도"
        aria-busy={!ready && !error}
      />

      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface text-sm text-muted">
          지도 불러오는 중...
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 border border-dashed border-border bg-surface px-4 text-center text-sm text-muted">
          <p className="font-medium text-foreground">지도를 불러올 수 없습니다</p>
          <p>잠시 후 다시 시도해 주세요.</p>
        </div>
      )}
    </div>
  );
}
