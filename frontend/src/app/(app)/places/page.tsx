"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FiveStarReplaceModal } from "@/components/FiveStarReplaceModal";
import { FourHalfStarConfirmModal } from "@/components/FourHalfStarConfirmModal";
import { DeletePlaceConfirmModal } from "@/components/DeletePlaceConfirmModal";
import { PlaceReviewsModal } from "@/components/PlaceReviewsModal";
import { PlaceRatingPicker } from "@/components/PlaceRatingPicker";
import { RatingDisplay } from "@/components/RatingDisplay";
import { TopRankerEndorsementBadge } from "@/components/TopRankerEndorsementBadge";
import { GuestPromptModal } from "@/components/GuestPromptModal";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea } from "@/components/ui/Input";
import { KakaoMap } from "@/components/KakaoMap";
import { KakaoMapLinks } from "@/components/KakaoMapLinks";
import { KakaoPoiResultList } from "@/components/KakaoPoiResultList";
import { api, Place, RatingQuota, TIER_LABELS } from "@/lib/api";
import { PREMIUM_RATING_META } from "@/lib/place-ratings";
import { KakaoPoiResult } from "@/lib/kakao-map";
import {
  buildPlaceByKakaoIdMap,
  findPlaceByKakaoId,
} from "@/lib/place-kakao-match";
import { useKakaoPlaceSearch } from "@/hooks/use-kakao-place-search";
import {
  applyPoiToRegisterForm,
  clearPlaceRegisterDraft,
  PLACE_REGISTER_ADD_QUERY,
  readPlaceRegisterDraft,
} from "@/lib/place-register-draft";
import { isGuestSession } from "@/lib/auth-session";
import { scrollFormIntoView } from "@/lib/mobile-form-scroll";
import type { WriteAction } from "@/lib/permissions";
import { MapPin, Star, Plus, Award, ThumbsUp, ThumbsDown, Map, MessageSquare, Search, X, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PLACE_REGISTER_MAP_HEIGHT = 300;

function matchesPlaceListSearch(place: Place, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    place.name.toLowerCase().includes(q) ||
    place.address.toLowerCase().includes(q) ||
    (place.category?.toLowerCase().includes(q) ?? false)
  );
}

export default function PlacesPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted">불러오는 중…</div>}>
      <PlacesPageContent />
    </Suspense>
  );
}

function PlacesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addFormRef = useRef<HTMLDivElement>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [quota, setQuota] = useState<RatingQuota | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");
  const [kakaoPlaceId, setKakaoPlaceId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const poiSearch = useKakaoPlaceSearch();
  const [ratingPlace, setRatingPlace] = useState<string | null>(null);
  const [rating, setRating] = useState(4);
  const [reviewText, setReviewText] = useState("");
  const [replaceModal, setReplaceModal] = useState<{
    placeId: string;
    placeName: string;
  } | null>(null);
  const [fourHalfConfirm, setFourHalfConfirm] = useState<{
    placeId: string;
    placeName: string;
  } | null>(null);
  const [reviewsModal, setReviewsModal] = useState<{
    placeId: string;
    placeName: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    placeId: string;
    placeName: string;
  } | null>(null);
  const [guestPrompt, setGuestPrompt] = useState(false);
  const [guestAction, setGuestAction] = useState<WriteAction>("review_write");
  const [listSearch, setListSearch] = useState("");

  const requireMember = (action: WriteAction, fn: () => void) => {
    if (isGuestSession()) {
      setGuestAction(action);
      setGuestPrompt(true);
      return;
    }
    fn();
  };

  const loadQuota = useCallback(async () => {
    try {
      const q = await api.profiles.ratingQuota();
      setQuota(q);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    api.places.list().then(setPlaces).catch(() => {});
    loadQuota();
  }, [loadQuota]);

  const filteredPlaces = useMemo(
    () => places.filter((p) => matchesPlaceListSearch(p, listSearch)),
    [places, listSearch]
  );

  const placeByKakaoId = useMemo(() => buildPlaceByKakaoIdMap(places), [places]);

  const matchedExistingPlace = useMemo(
    () => findPlaceByKakaoId(placeByKakaoId, kakaoPlaceId),
    [placeByKakaoId, kakaoPlaceId]
  );

  const markers = useMemo(
    () => filteredPlaces.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng })),
    [filteredPlaces]
  );

  const listSearchActive = listSearch.trim().length > 0;

  const resetAddForm = () => {
    setName("");
    setAddress("");
    setCategory("");
    setKakaoPlaceId(null);
    setCoords(null);
    poiSearch.clear();
  };

  const handleSelectPoi = useCallback(
    (poi: KakaoPoiResult) => {
      applyPoiToRegisterForm({
        poi,
        setName,
        setAddress,
        setCoords,
        setKakaoPlaceId,
        setSelectedPoiId: poiSearch.setSelectedPoiId,
      });
    },
    [poiSearch.setSelectedPoiId]
  );

  const scrollToAddForm = useCallback(() => {
    scrollFormIntoView(addFormRef.current);
  }, []);

  const openAddForm = useCallback(
    (poi?: KakaoPoiResult) => {
      const resolved = poi ?? readPlaceRegisterDraft() ?? undefined;
      if (resolved) {
        handleSelectPoi(resolved);
        clearPlaceRegisterDraft();
      }
      setShowAdd(true);
    },
    [handleSelectPoi]
  );

  useEffect(() => {
    if (!showAdd) return;
    scrollToAddForm();
  }, [showAdd, scrollToAddForm]);

  useEffect(() => {
    if (searchParams.get(PLACE_REGISTER_ADD_QUERY) !== "1") return;

    const roomId = searchParams.get("roomId");
    const returnPath = searchParams.get("return");
    const replaceQ = new URLSearchParams();
    if (roomId) replaceQ.set("roomId", roomId);
    if (returnPath) replaceQ.set("return", returnPath);
    const replaceUrl = replaceQ.toString() ? `/places?${replaceQ.toString()}` : "/places";
    router.replace(replaceUrl, { scroll: false });

    if (isGuestSession()) {
      setGuestAction("review_write");
      setGuestPrompt(true);
      return;
    }

    openAddForm();
  }, [searchParams, router, openAddForm]);

  const handleAdd = async () => {
    if (!name || !address || !kakaoPlaceId || matchedExistingPlace) return;
    const lat = coords?.lat ?? 37.5665;
    const lng = coords?.lng ?? 126.978;
    const roomId = searchParams.get("roomId");
    const returnPath = searchParams.get("return");
    try {
      const place = await api.places.create({
        name,
        address,
        lat,
        lng,
        category: category || undefined,
        kakao_place_id: kakaoPlaceId,
        room_id: roomId || undefined,
      });
      setPlaces((prev) => [place, ...prev]);
      setShowAdd(false);
      resetAddForm();
      if (returnPath && roomId) {
        const sep = returnPath.includes("?") ? "&" : "?";
        router.push(`${returnPath}${sep}placeId=${encodeURIComponent(place.id)}`);
        return;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "등록 실패");
    }
  };

  const submitRating = async (placeId: string, replacePlaceId?: string) => {
    try {
      await api.places.rate(placeId, {
        rating,
        replace_place_id: replacePlaceId,
        review: reviewText,
      });
      setRatingPlace(null);
      setReviewText("");
      setReplaceModal(null);
      const [updated, q] = await Promise.all([api.places.list(), api.profiles.ratingQuota()]);
      setPlaces(updated);
      setQuota(q);
    } catch (err) {
      alert(err instanceof Error ? err.message : "평가 실패");
    }
  };

  const handleRate = async (placeId: string) => {
    const place = places.find((p) => p.id === placeId);
    if (!place) return;

    if (rating === 5 && quota) {
      const alreadyFive = quota.five_star.places.some((p) => p.place_id === placeId);
      if (!alreadyFive && quota.five_star.used >= quota.five_star.max) {
        setReplaceModal({ placeId, placeName: place.name });
        return;
      }
    }

    if (rating === 4.5 && place.my_rating !== 4.5) {
      setFourHalfConfirm({ placeId, placeName: place.name });
      return;
    }

    await submitRating(placeId);
  };

  const handleRecommendation = async (placeId: string, vote: "RECOMMEND" | "NOT_RECOMMEND") => {
    try {
      await api.places.voteRecommendation(placeId, vote);
      const updated = await api.places.list();
      setPlaces(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "투표 실패");
    }
  };

  const handleDeletePlace = async (placeId: string) => {
    try {
      await api.places.delete(placeId);
      setPlaces((prev) => prev.filter((p) => p.id !== placeId));
      if (ratingPlace === placeId) setRatingPlace(null);
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 실패");
    }
  };

  const openRating = (place: Place) => {
    setRatingPlace(place.id);
    setRating(place.my_rating ?? 4);
    setReviewText(place.my_review ?? "");
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <Link href="/places/map">
              <Button variant="secondary">
                <Map className="h-4 w-4" /> 지도로 보기
              </Button>
            </Link>
            <Button
              onClick={() =>
                requireMember("review_write", () => {
                  if (showAdd) {
                    setShowAdd(false);
                    resetAddForm();
                  } else {
                    openAddForm();
                  }
                })
              }
            >
              <Plus className="h-4 w-4" /> {showAdd ? "등록 닫기" : "장소 등록"}
            </Button>
          </div>
        </div>

        {places.length > 0 && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                label="등록된 맛집 검색"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="이름, 주소, 카테고리…"
              />
            </div>
            {listSearchActive && (
              <Button variant="secondary" onClick={() => setListSearch("")}>
                <X className="h-4 w-4" /> 초기화
              </Button>
            )}
          </div>
        )}

        {filteredPlaces.length > 0 && (
          <div className="mt-6">
            <KakaoMap markers={markers} height={320} useClusterer={markers.length > 1} />
          </div>
        )}

        {places.length > 0 && listSearchActive && filteredPlaces.length === 0 && (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            <Search className="mx-auto h-8 w-8 opacity-40" />
            <p className="mt-3">「{listSearch.trim()}」에 맞는 등록 맛집이 없습니다</p>
            <Link href="/places/map" className="mt-3 inline-block text-primary hover:underline">
              지도에서 더 찾아보기 →
            </Link>
          </div>
        )}

        {showAdd && (
          <div ref={addFormRef} id="place-register-form" className="mt-6 scroll-mt-24">
          <Card>
            <CardTitle>새 장소 등록</CardTitle>
            <div className="mt-4 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <Input
                    label="상호·주소 검색"
                    value={poiSearch.query}
                    onChange={(e) => poiSearch.setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void poiSearch.search();
                    }}
                    placeholder="맛집 이름, 동네, 도로명 주소…"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => void poiSearch.search()}
                  disabled={poiSearch.loading}
                >
                  {poiSearch.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  검색
                </Button>
              </div>

              {poiSearch.error && <p className="text-sm text-accent">{poiSearch.error}</p>}

              <KakaoPoiResultList
                results={poiSearch.results}
                placeByKakaoId={placeByKakaoId}
                selectedPoiId={poiSearch.selectedPoiId}
                variant="register"
                onSelect={handleSelectPoi}
                onViewReviews={(place) =>
                  setReviewsModal({ placeId: place.id, placeName: place.name })
                }
                className="max-h-64"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="이름"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="맛있는 식당"
                />
                <Input
                  label="카테고리"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="한식, 일식 등"
                />
                <div className="sm:col-span-2">
                  <Input
                    label="주소"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="서울시 강남구..."
                  />
                  {coords && (
                    <p className="mt-1 text-xs text-muted">
                      {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {matchedExistingPlace && (
              <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
                선택한 장소는 이미 등록되어 있습니다. 새로 등록할 수 없습니다.
              </div>
            )}

            <div className="mt-4" style={{ minHeight: PLACE_REGISTER_MAP_HEIGHT }}>
              {coords ? (
                <KakaoMap
                  markers={[
                    {
                      id: "preview",
                      name: name || "미리보기",
                      lat: coords.lat,
                      lng: coords.lng,
                    },
                  ]}
                  center={coords}
                  level={3}
                  height={PLACE_REGISTER_MAP_HEIGHT}
                  useClusterer={false}
                  recenterOnSelect={false}
                />
              ) : (
                <div
                  className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-4 text-center text-sm text-muted"
                  style={{ height: PLACE_REGISTER_MAP_HEIGHT }}
                >
                  검색 결과에서 장소를 선택하면 지도 미리보기가 표시됩니다
                </div>
              )}
            </div>
            <Button
              className="mt-4"
              onClick={() => void handleAdd()}
              disabled={!kakaoPlaceId || !name || !address || Boolean(matchedExistingPlace)}
            >
              등록하기
            </Button>
            {!kakaoPlaceId && (
              <p className="mt-2 text-xs text-muted">
                카카오맵 검색 결과에서 장소를 선택해야 등록할 수 있습니다.
              </p>
            )}
          </Card>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 rounded-xl bg-surface p-4 text-sm text-muted sm:flex-row sm:items-center sm:gap-4">
          <Award className="h-5 w-5 text-warm shrink-0" />
          <div className="space-y-1">
            <p>
              <strong className="text-foreground">{PREMIUM_RATING_META[5].label}</strong>(5점)은
              평생 최대 5곳 · 꽉 차면 다른 인생맛집과 교체할 수 있어요
            </p>
            <p>
              <strong className="text-foreground">{PREMIUM_RATING_META[4.5].label}</strong>
              (4.5점)은 이번 달{" "}
              {quota ? `${quota.four_half.used}/${quota.four_half.max}회` : "5회"} ·{" "}
              <span className="text-warm">4.5에서 벗어나면 횟수 환불</span>
            </p>
            <p>
              <strong className="text-foreground">추천/비추천</strong>은 별점과 별개 · 장소
              추천인 신뢰도 ±1 (일일 상한 없음, 장소당 1표)
            </p>
            {quota && (
              <p className="text-xs">
                내 {PREMIUM_RATING_META[5].label} 사용: {quota.five_star.used}/{quota.five_star.max}
                곳
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {places.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <MapPin className="mx-auto h-12 w-12 text-muted/40" />
              <p className="mt-4 text-muted">등록된 장소가 없습니다</p>
            </div>
          ) : filteredPlaces.length === 0 ? (
            null
          ) : (
            filteredPlaces.map((place) => (
              <Card key={place.id}>
                <div className="flex items-start justify-between">
                  <Badge variant="tier" tier={place.tier}>
                    {TIER_LABELS[place.tier]}
                  </Badge>
                  <div className="flex shrink-0 flex-col items-center gap-1 text-center">
                    <RatingDisplay value={place.avg_rating} size="sm" />
                    <span className="text-xs text-muted">({place.rating_count}명)</span>
                  </div>
                </div>
                <CardTitle className="mt-3">{place.name}</CardTitle>
                <CardDescription>{place.address}</CardDescription>
                {place.past_travel_hint && (
                  <p className="mt-2 text-xs text-accent">{place.past_travel_hint}</p>
                )}
                <KakaoMapLinks
                  className="mt-2"
                  place={{
                    name: place.name,
                    lat: place.lat,
                    lng: place.lng,
                    kakao_place_id: place.kakao_place_id,
                  }}
                />
                {place.category && (
                  <span className="mt-2 inline-block text-xs text-muted">{place.category}</span>
                )}
                {place.recommender_title && (
                  <p className="mt-2 text-xs text-primary">
                    등록: {place.recommender_title}
                  </p>
                )}
                {place.top_ranker_endorsement && (
                  <TopRankerEndorsementBadge endorsement={place.top_ranker_endorsement} />
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {place.is_mine && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="border-2 border-red-900/50 text-red-700 hover:border-red-800 hover:bg-red-50"
                      onClick={() =>
                        requireMember("review_write", () =>
                          setDeleteConfirm({ placeId: place.id, placeName: place.name })
                        )
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" /> 삭제
                    </Button>
                  )}
                  {!place.is_mine && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        className={cn(
                          "border-2 font-semibold transition-colors",
                          place.my_recommendation_vote === "RECOMMEND"
                            ? "border-red-600 bg-red-600 text-white shadow-sm hover:border-red-700 hover:bg-red-700 hover:text-white"
                            : "border-border bg-surface text-muted hover:border-red-200 hover:bg-red-50/50 hover:text-red-600"
                        )}
                        onClick={() => requireMember("review_write", () => handleRecommendation(place.id, "RECOMMEND"))}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" /> 추천
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className={cn(
                          "border-2 font-semibold transition-colors",
                          place.my_recommendation_vote === "NOT_RECOMMEND"
                            ? "border-blue-600 bg-blue-600 text-white shadow-sm hover:border-blue-700 hover:bg-blue-700 hover:text-white"
                            : "border-border bg-surface text-muted hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-600"
                        )}
                        onClick={() => requireMember("review_write", () => handleRecommendation(place.id, "NOT_RECOMMEND"))}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" /> 비추천
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setReviewsModal({ placeId: place.id, placeName: place.name })
                    }
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> 리뷰 보기
                  </Button>
                </div>

                {place.my_review && (
                  <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs text-muted">
                    내 리뷰: {place.my_review}
                  </p>
                )}

                {ratingPlace === place.id ? (
                  <div className="mt-4 space-y-3">
                    <PlaceRatingPicker
                      value={rating}
                      onChange={setRating}
                      fourHalfUsed={quota?.four_half.used}
                      fourHalfMax={quota?.four_half.max}
                    />
                    <Textarea
                      label="한줄 리뷰 (선택)"
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      rows={2}
                      placeholder="분위기, 메뉴 추천 등"
                    />
                    <Button size="sm" onClick={() => handleRate(place.id)}>평가</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" className="mt-4" onClick={() => requireMember("review_write", () => openRating(place))}>
                    <Star className="h-3.5 w-3.5" /> {place.my_rating != null ? "평가 수정" : "평가하기"}
                  </Button>
                )}
              </Card>
            ))
          )}
        </div>

      <FourHalfStarConfirmModal
        open={Boolean(fourHalfConfirm)}
        placeName={fourHalfConfirm?.placeName ?? ""}
        used={quota?.four_half.used ?? 0}
        max={quota?.four_half.max ?? 5}
        onCancel={() => setFourHalfConfirm(null)}
        onConfirm={() => {
          if (fourHalfConfirm) {
            const { placeId } = fourHalfConfirm;
            setFourHalfConfirm(null);
            void submitRating(placeId);
          }
        }}
      />

      <FiveStarReplaceModal
        open={Boolean(replaceModal)}
        targetPlaceName={replaceModal?.placeName ?? ""}
        existingPlaces={quota?.five_star.places ?? []}
        onCancel={() => setReplaceModal(null)}
        onConfirm={(replacePlaceId) => {
          if (replaceModal) submitRating(replaceModal.placeId, replacePlaceId);
        }}
      />

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
        onChanged={() => api.places.list().then(setPlaces).catch(() => {})}
      />

      <GuestPromptModal
        open={guestPrompt}
        action={guestAction}
        onClose={() => setGuestPrompt(false)}
      />
    </div>
  );
}
