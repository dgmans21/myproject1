"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KakaoMap, KakaoMapHandle } from "@/components/KakaoMap";
import { KakaoMapLinks } from "@/components/KakaoMapLinks";
import { KakaoPoiResultList } from "@/components/KakaoPoiResultList";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PlaceReviewsModal } from "@/components/PlaceReviewsModal";
import { DeletePlaceConfirmModal } from "@/components/DeletePlaceConfirmModal";
import { useKakaoPlaceSearch } from "@/hooks/use-kakao-place-search";
import { api, Place, TIER_LABELS } from "@/lib/api";
import { KakaoPoiResult } from "@/lib/kakao-map";
import {
  buildPlaceByKakaoIdMap,
  filterPlacesWithinRadius,
  findPlaceByKakaoId,
} from "@/lib/place-kakao-match";
import {
  PLACES_MAP_PROGRAMMATIC_CENTER_SUPPRESS_MS,
  PLACES_MAP_RADIUS_KM,
  PLACES_MAP_SEARCH_ZOOM_LEVEL,
} from "@/lib/places-map-config";
import {
  placesMapSplitGridHeight,
  placesMapViewportHeight,
} from "@/lib/map-viewport-height";
import { placeRegisterHref } from "@/lib/place-register-draft";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, MapPin, MessageSquare, Plus, Search, Trash2, X } from "lucide-react";

function SelectedPlaceCard({
  place,
  onOpenReviews,
  onDelete,
  className,
}: {
  place: Place;
  onOpenReviews: () => void;
  onDelete?: () => void;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge variant="tier" tier={place.tier}>
            {TIER_LABELS[place.tier]}
          </Badge>
          <CardTitle className="mt-2">{place.name}</CardTitle>
          <CardDescription>{place.address}</CardDescription>
          {place.past_travel_hint && (
            <p className="mt-2 text-xs text-accent">{place.past_travel_hint}</p>
          )}
        </div>
        <KakaoMapLinks
          place={{
            name: place.name,
            lat: place.lat,
            lng: place.lng,
            kakao_place_id: place.kakao_place_id,
          }}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onOpenReviews}>
          <MessageSquare className="h-3.5 w-3.5" /> 리뷰 보기
        </Button>
        {place.is_mine && onDelete && (
          <Button
            size="sm"
            variant="secondary"
            className="border-2 border-red-900/50 text-red-700 hover:border-red-800 hover:bg-red-50"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" /> 삭제
          </Button>
        )}
      </div>
    </Card>
  );
}

function SelectedSearchPoiCard({
  poi,
  matchedPlace,
  nearbyCount,
  onOpenReviews,
  onRegister,
  className,
}: {
  poi: KakaoPoiResult;
  matchedPlace?: Place;
  nearbyCount: number;
  onOpenReviews?: () => void;
  onRegister?: () => void;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <CardTitle className="text-base">{poi.name}</CardTitle>
        {matchedPlace && (
          <Badge variant="tier" tier={matchedPlace.tier}>
            등록된 맛집
          </Badge>
        )}
      </div>
      <CardDescription className="mt-1">{poi.address}</CardDescription>
      <p className="mt-2 text-xs text-muted">
        반경 {PLACES_MAP_RADIUS_KM}km 내 등록 맛집 {nearbyCount}곳
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {matchedPlace && onOpenReviews && (
          <Button size="sm" variant="secondary" onClick={onOpenReviews}>
            <MessageSquare className="h-3.5 w-3.5" /> 리뷰 보기
          </Button>
        )}
        {!matchedPlace && onRegister && (
          <Button size="sm" onClick={onRegister}>
            <Plus className="h-3.5 w-3.5" /> 맛집 등록하기
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function PlacesMapPage() {
  const router = useRouter();
  const [places, setPlaces] = useState<Place[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapLevel, setMapLevel] = useState<number | undefined>(undefined);
  const [viewportCenter, setViewportCenter] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSearchPoi, setSelectedSearchPoi] = useState<KakaoPoiResult | null>(null);
  const [reviewsModal, setReviewsModal] = useState<{
    placeId: string;
    placeName: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    placeId: string;
    placeName: string;
  } | null>(null);

  const mapHandleRef = useRef<KakaoMapHandle | null>(null);
  const ignoreCenterUntilRef = useRef(0);

  const poiSearch = useKakaoPlaceSearch();
  const {
    query: poiSearchQuery,
    setQuery: setPoiSearchQuery,
    results: poiSearchResults,
    loading: poiSearchLoading,
    error: poiSearchError,
    selectedPoiId: selectedPoiSearchId,
    setSelectedPoiId: setSelectedPoiSearchId,
    search: runPoiSearch,
    clear: clearPoiSearch,
  } = poiSearch;

  useEffect(() => {
    api.places.list().then(setPlaces).catch(() => {});
  }, []);

  const placeByKakaoId = useMemo(() => buildPlaceByKakaoIdMap(places), [places]);

  const handleCenterChanged = useCallback((center: { lat: number; lng: number }) => {
    if (Date.now() < ignoreCenterUntilRef.current) return;
    setViewportCenter(center);
  }, []);

  const nearbyPlaces = useMemo(() => {
    if (!viewportCenter) return [];
    return filterPlacesWithinRadius(places, viewportCenter, PLACES_MAP_RADIUS_KM);
  }, [places, viewportCenter]);

  const markers = useMemo(
    () =>
      nearbyPlaces.map((p) => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
      })),
    [nearbyPlaces]
  );

  const selectedPlace = nearbyPlaces.find((p) => p.id === selectedId);
  const selectedPoiMatchedPlace = selectedSearchPoi
    ? findPlaceByKakaoId(placeByKakaoId, selectedSearchPoi.id)
    : undefined;

  const flyToPoi = useCallback(
    (poi: KakaoPoiResult) => {
      const center = { lat: poi.lat, lng: poi.lng };
      setViewportCenter(center);
      ignoreCenterUntilRef.current = Date.now() + PLACES_MAP_PROGRAMMATIC_CENTER_SUPPRESS_MS;
      setMapCenter(center);
      setMapLevel(PLACES_MAP_SEARCH_ZOOM_LEVEL);
      setSelectedSearchPoi(poi);
      setSelectedPoiSearchId(poi.id);

      const matched = findPlaceByKakaoId(placeByKakaoId, poi.id);
      setSelectedId(matched?.id ?? null);
    },
    [placeByKakaoId, setSelectedPoiSearchId]
  );

  const goToRegister = useCallback(
    (poi?: KakaoPoiResult) => {
      router.push(placeRegisterHref(poi));
    },
    [router]
  );

  const handleSearchSubmit = () => {
    const q = poiSearchQuery.trim();
    if (!q) {
      handleClearSearch();
      return;
    }
    setSelectedSearchPoi(null);
    setSelectedId(null);
    void runPoiSearch(q);
  };

  const handleClearSearch = () => {
    clearPoiSearch();
    setSelectedSearchPoi(null);
    setSelectedId(null);
    setMapCenter(null);
    setMapLevel(undefined);
  };

  const handleResearchInView = () => {
    const center = mapHandleRef.current?.getCenter();
    if (!center) return;
    setViewportCenter(center);
    setSelectedId(null);
    setSelectedSearchPoi(null);
    setSelectedPoiSearchId(null);
  };

  const handleDeletePlace = async (placeId: string) => {
    try {
      await api.places.delete(placeId);
      setPlaces((prev) => prev.filter((p) => p.id !== placeId));
      setSelectedId(null);
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 실패");
    }
  };

  const requestDeletePlace = (place: Place) => {
    setDeleteConfirm({ placeId: place.id, placeName: place.name });
  };

  const hasSearchResults = poiSearchResults.length > 0;
  const mobileMapHeight = placesMapViewportHeight(
    Boolean(selectedPlace || selectedSearchPoi)
  );
  const hasViewport = viewportCenter != null;
  const showEmptyNearby =
    hasViewport &&
    nearbyPlaces.length === 0 &&
    (!hasSearchResults || selectedSearchPoi != null);

  const poiResultList = (
    <KakaoPoiResultList
      results={poiSearchResults}
      placeByKakaoId={placeByKakaoId}
      selectedPoiId={selectedPoiSearchId}
      variant="map"
      onSelect={flyToPoi}
      className={hasSearchResults ? "max-h-64 lg:max-h-none lg:flex-1" : undefined}
    />
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:max-w-none lg:px-6">
      <Link
        href="/places"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 맛집 목록
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Input
            label="지역·상호 검색"
            value={poiSearchQuery}
            onChange={(e) => setPoiSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearchSubmit();
            }}
            placeholder="논현동, 강남 맛집, 스타벅스 역삼점…"
          />
          <p className="mt-1 text-xs text-muted">
            검색 결과에서 장소를 선택하면 지도가 이동합니다. 마커는 반경 {PLACES_MAP_RADIUS_KM}
            km 내 등록 맛집만 표시됩니다.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={handleSearchSubmit} disabled={poiSearchLoading}>
            {poiSearchLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            검색
          </Button>
          {(poiSearchQuery.trim() || hasSearchResults) && (
            <Button variant="secondary" onClick={handleClearSearch}>
              <X className="h-4 w-4" /> 초기화
            </Button>
          )}
        </div>
      </div>

      {poiSearchError && <p className="mb-4 text-sm text-accent">{poiSearchError}</p>}

      {hasSearchResults && <div className="mb-4 lg:hidden">{poiResultList}</div>}

      <div
        className="lg:grid lg:grid-cols-[3fr_2fr] lg:items-stretch lg:gap-6"
        style={
          {
            "--map-mobile-h": mobileMapHeight,
            "--map-split-h": placesMapSplitGridHeight(),
          } as React.CSSProperties
        }
      >
        <div className="relative min-h-0 h-[var(--map-mobile-h)] lg:h-[var(--map-split-h)]">
          <KakaoMap
            markers={markers}
            center={mapCenter ?? undefined}
            level={mapLevel}
            selectedMarkerId={selectedId}
            onMarkerClick={setSelectedId}
            onCenterChanged={handleCenterChanged}
            height="100%"
            className="h-full min-h-0"
            useClusterer={markers.length > 1}
            fitBounds={false}
            recenterOnSelect
            mapHandleRef={mapHandleRef}
            overlay={
              <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="pointer-events-auto shadow-md"
                  onClick={handleResearchInView}
                >
                  이 지역에서 재검색
                </Button>
              </div>
            }
          />
        </div>

        <aside className="mt-6 flex min-h-0 flex-col gap-3 lg:mt-0 lg:overflow-y-auto lg:h-[var(--map-split-h)]">
          {hasSearchResults && <div className="hidden lg:flex lg:min-h-0 lg:flex-1">{poiResultList}</div>}

          {selectedSearchPoi && !selectedPlace && (
            <SelectedSearchPoiCard
              poi={selectedSearchPoi}
              matchedPlace={selectedPoiMatchedPlace}
              nearbyCount={nearbyPlaces.length}
              className="hidden lg:block"
              onOpenReviews={
                selectedPoiMatchedPlace
                  ? () =>
                      setReviewsModal({
                        placeId: selectedPoiMatchedPlace.id,
                        placeName: selectedPoiMatchedPlace.name,
                      })
                  : undefined
              }
              onRegister={
                !selectedPoiMatchedPlace
                  ? () => goToRegister(selectedSearchPoi)
                  : undefined
              }
            />
          )}

          {selectedPlace && (
            <SelectedPlaceCard
              place={selectedPlace}
              className="hidden lg:block"
              onOpenReviews={() =>
                setReviewsModal({
                  placeId: selectedPlace.id,
                  placeName: selectedPlace.name,
                })
              }
              onDelete={() => requestDeletePlace(selectedPlace)}
            />
          )}

          {showEmptyNearby && (
            <Card className="hidden lg:block">
              <div className="text-center">
                <MapPin className="mx-auto h-8 w-8 text-muted/40" />
                <p className="mt-3 text-sm text-muted">이 지역에 등록된 맛집이 없습니다</p>
                <p className="mt-1 text-xs text-muted">
                  반경 {PLACES_MAP_RADIUS_KM}km 기준 · 지도를 옮기거나 재검색해 보세요
                </p>
                <Button size="sm" onClick={() => goToRegister(selectedSearchPoi ?? undefined)}>
                  <Plus className="h-3.5 w-3.5" /> 맛집 등록하기
                </Button>
              </div>
            </Card>
          )}

          {nearbyPlaces.length > 0 && (
            <div className="hidden min-h-0 flex-col gap-2 lg:flex">
              <p className="text-sm font-semibold text-foreground">
                우리 맛집 ({nearbyPlaces.length})
              </p>
              <ul className="min-h-0 max-h-48 space-y-2 overflow-y-auto pr-1">
                {nearbyPlaces.map((place) => {
                  const active = place.id === selectedId;
                  return (
                    <li key={place.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(place.id)}
                        className={cn(
                          "w-full rounded-xl border p-3 text-left transition-colors",
                          active
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border bg-card hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="tier" tier={place.tier}>
                            {TIER_LABELS[place.tier]}
                          </Badge>
                          {active && (
                            <span className="text-xs font-medium text-primary">선택됨</span>
                          )}
                        </div>
                        <p className="mt-1.5 font-medium text-foreground">{place.name}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{place.address}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {selectedSearchPoi && !selectedPlace && (
        <SelectedSearchPoiCard
          poi={selectedSearchPoi}
          matchedPlace={selectedPoiMatchedPlace}
          nearbyCount={nearbyPlaces.length}
          className="mt-6 lg:hidden"
          onOpenReviews={
            selectedPoiMatchedPlace
              ? () =>
                  setReviewsModal({
                    placeId: selectedPoiMatchedPlace.id,
                    placeName: selectedPoiMatchedPlace.name,
                  })
              : undefined
          }
          onRegister={
            !selectedPoiMatchedPlace ? () => goToRegister(selectedSearchPoi) : undefined
          }
        />
      )}

      {selectedPlace && (
        <SelectedPlaceCard
          place={selectedPlace}
          className="mt-6 lg:hidden"
          onOpenReviews={() =>
            setReviewsModal({
              placeId: selectedPlace.id,
              placeName: selectedPlace.name,
            })
          }
          onDelete={() => requestDeletePlace(selectedPlace)}
        />
      )}

      {showEmptyNearby && (
        <Card className="mt-6 lg:hidden">
          <div className="text-center">
            <MapPin className="mx-auto h-8 w-8 text-muted/40" />
            <p className="mt-3 text-sm text-muted">이 지역에 등록된 맛집이 없습니다</p>
            <div className="mt-4">
              <Button size="sm" onClick={() => goToRegister(selectedSearchPoi ?? undefined)}>
                <Plus className="h-3.5 w-3.5" /> 맛집 등록하기
              </Button>
            </div>
          </div>
        </Card>
      )}

      <DeletePlaceConfirmModal
        open={Boolean(deleteConfirm)}
        placeName={deleteConfirm?.placeName ?? ""}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) void handleDeletePlace(deleteConfirm.placeId);
        }}
      />

      <PlaceReviewsModal
        open={Boolean(reviewsModal)}
        placeId={reviewsModal?.placeId ?? null}
        placeName={reviewsModal?.placeName}
        onClose={() => setReviewsModal(null)}
      />
    </div>
  );
}
