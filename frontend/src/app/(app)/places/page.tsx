"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { FiveStarReplaceModal } from "@/components/FiveStarReplaceModal";
import { PlaceReviewsModal } from "@/components/PlaceReviewsModal";
import { RatingDisplay } from "@/components/RatingDisplay";
import { GuestPromptModal } from "@/components/GuestPromptModal";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea } from "@/components/ui/Input";
import { KakaoMap } from "@/components/KakaoMap";
import { KakaoMapLinks } from "@/components/KakaoMapLinks";
import { api, Place, RatingQuota, TIER_LABELS } from "@/lib/api";
import { geocodeAddress } from "@/lib/kakao-map";
import { formatPlaceRating, PLACE_RATING_OPTIONS } from "@/lib/place-ratings";
import { isGuestSession } from "@/lib/auth-session";
import type { WriteAction } from "@/lib/permissions";
import { MapPin, Star, Plus, Award, ThumbsUp, ThumbsDown, Map, MessageSquare } from "lucide-react";

export default function PlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [quota, setQuota] = useState<RatingQuota | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [ratingPlace, setRatingPlace] = useState<string | null>(null);
  const [rating, setRating] = useState(4);
  const [reviewText, setReviewText] = useState("");
  const [replaceModal, setReplaceModal] = useState<{
    placeId: string;
    placeName: string;
  } | null>(null);
  const [reviewsModal, setReviewsModal] = useState<{
    placeId: string;
    placeName: string;
  } | null>(null);
  const [guestPrompt, setGuestPrompt] = useState(false);
  const [guestAction, setGuestAction] = useState<WriteAction>("review_write");

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

  const markers = useMemo(
    () => places.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng })),
    [places]
  );

  const handleGeocode = async () => {
    if (!address.trim()) return;
    setGeocoding(true);
    try {
      const result = await geocodeAddress(address.trim());
      if (result) {
        setCoords({ lat: result.lat, lng: result.lng });
      } else {
        alert("주소를 찾을 수 없습니다.");
      }
    } catch {
      alert("주소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setGeocoding(false);
    }
  };

  const handleAdd = async () => {
    if (!name || !address) return;
    const lat = coords?.lat ?? 37.5665;
    const lng = coords?.lng ?? 126.978;
    try {
      const place = await api.places.create({
        name,
        address,
        lat,
        lng,
        category: category || undefined,
      });
      setPlaces((prev) => [place, ...prev]);
      setShowAdd(false);
      setName("");
      setAddress("");
      setCategory("");
      setCoords(null);
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

  const openRating = (place: Place) => {
    setRatingPlace(place.id);
    setRating(place.my_rating ?? 4);
    setReviewText(place.my_review ?? "");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">맛집 탐색</h1>
            <p className="mt-1 text-muted">맛집 등급 · 추천 투표 · 이동 시간 안내</p>
          </div>
          <div className="flex gap-2">
            <Link href="/places/map">
              <Button variant="secondary">
                <Map className="h-4 w-4" /> 지도로 보기
              </Button>
            </Link>
            <Button onClick={() => requireMember("review_write", () => setShowAdd(!showAdd))}>
              <Plus className="h-4 w-4" /> 장소 등록
            </Button>
          </div>
        </div>

        {places.length > 0 && (
          <div className="mt-6">
            <KakaoMap markers={markers} height={320} useClusterer={markers.length > 1} />
          </div>
        )}

        {showAdd && (
          <Card className="mt-6">
            <CardTitle>새 장소 등록</CardTitle>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input label="이름" value={name} onChange={(e) => setName(e.target.value)} placeholder="맛있는 식당" />
              <Input label="카테고리" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="한식, 일식 등" />
              <div className="sm:col-span-2 space-y-2">
                <Input label="주소" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="서울시 강남구..." />
                <div className="flex items-center gap-3">
                  <Button type="button" size="sm" variant="secondary" onClick={handleGeocode} disabled={geocoding}>
                    {geocoding ? "검색 중..." : "주소 검색"}
                  </Button>
                  {coords && (
                    <span className="text-xs text-muted">
                      {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {coords && (
              <div className="mt-4">
                <KakaoMap
                  markers={[{ id: "preview", name: name || "미리보기", lat: coords.lat, lng: coords.lng }]}
                  center={coords}
                  level={3}
                  height={240}
                  useClusterer={false}
                />
              </div>
            )}
            <Button className="mt-4" onClick={handleAdd}>등록하기</Button>
          </Card>
        )}

        <div className="mt-6 flex flex-col gap-2 rounded-xl bg-surface p-4 text-sm text-muted sm:flex-row sm:items-center sm:gap-4">
          <Award className="h-5 w-5 text-warm shrink-0" />
          <div className="space-y-1">
            <p>
              <strong className="text-foreground">5점</strong>은 평생 최대 5곳 · 다 쓰면 기존 5점
              하나를 취소하고 새로 줄 수 있어요
            </p>
            <p>
              <strong className="text-foreground">4.5점</strong>은 이번 달{" "}
              {quota ? `${quota.four_half.used}/${quota.four_half.max}회` : "5회"} (별점 한도)
            </p>
            <p>
              <strong className="text-foreground">추천/비추천</strong>은 별점과 별개 · 장소
              추천인 신뢰도 ±1 (일일 상한 없음, 장소당 1표)
            </p>
            {quota && (
              <p className="text-xs">
                내 5점 사용: {quota.five_star.used}/{quota.five_star.max}곳
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
          ) : (
            places.map((place) => (
              <Card key={place.id}>
                <div className="flex items-start justify-between">
                  <Badge variant="tier" tier={place.tier}>
                    {TIER_LABELS[place.tier]}
                  </Badge>
                  <div className="flex flex-col items-end gap-1">
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
                    추천: {place.recommender_title}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={place.my_recommendation_vote === "RECOMMEND" ? "primary" : "secondary"}
                    onClick={() => requireMember("review_write", () => handleRecommendation(place.id, "RECOMMEND"))}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" /> 추천
                  </Button>
                  <Button
                    size="sm"
                    variant={place.my_recommendation_vote === "NOT_RECOMMEND" ? "accent" : "ghost"}
                    onClick={() => requireMember("review_write", () => handleRecommendation(place.id, "NOT_RECOMMEND"))}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" /> 비추천
                  </Button>
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
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {PLACE_RATING_OPTIONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRating(r)}
                          className={`min-w-[2.25rem] rounded-lg px-2 py-1 text-sm ${
                            rating === r ? "bg-warm/20 text-warm font-bold" : "text-muted"
                          }`}
                        >
                          {formatPlaceRating(r)}
                        </button>
                      ))}
                    </div>
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
      </main>

      <FiveStarReplaceModal
        open={Boolean(replaceModal)}
        targetPlaceName={replaceModal?.placeName ?? ""}
        existingPlaces={quota?.five_star.places ?? []}
        onCancel={() => setReplaceModal(null)}
        onConfirm={(replacePlaceId) => {
          if (replaceModal) submitRating(replaceModal.placeId, replacePlaceId);
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
