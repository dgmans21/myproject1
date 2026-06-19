"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { api, Place, TIER_LABELS } from "@/lib/api";
import { MapPin, Star, Plus, Award } from "lucide-react";

export default function PlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");
  const [ratingPlace, setRatingPlace] = useState<string | null>(null);
  const [rating, setRating] = useState(4);

  useEffect(() => {
    api.places.list().then(setPlaces).catch(() => {});
  }, []);

  const handleAdd = async () => {
    if (!name || !address) return;
    try {
      const place = await api.places.create({
        name,
        address,
        lat: 37.5665 + Math.random() * 0.01,
        lng: 126.978 + Math.random() * 0.01,
        category: category || undefined,
      });
      setPlaces((prev) => [place, ...prev]);
      setShowAdd(false);
      setName("");
      setAddress("");
      setCategory("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "등록 실패");
    }
  };

  const handleRate = async (placeId: string) => {
    try {
      await api.places.rate(placeId, { rating });
      setRatingPlace(null);
      const updated = await api.places.list();
      setPlaces(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "평가 실패");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">맛집 탐색</h1>
            <p className="mt-1 text-muted">티어제 기반 장소 추천 · 월 5회 5점 제한</p>
          </div>
          <Button onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4" /> 장소 등록
          </Button>
        </div>

        {showAdd && (
          <Card className="mt-6">
            <CardTitle>새 장소 등록</CardTitle>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input label="이름" value={name} onChange={(e) => setName(e.target.value)} placeholder="맛있는 식당" />
              <Input label="카테고리" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="한식, 일식 등" />
              <Input label="주소" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="서울시 강남구..." className="sm:col-span-2" />
            </div>
            <Button className="mt-4" onClick={handleAdd}>등록하기</Button>
          </Card>
        )}

        <div className="mt-6 flex items-center gap-4 rounded-xl bg-surface p-4 text-sm text-muted">
          <Award className="h-5 w-5 text-warm shrink-0" />
          <span>
            5점 평가는 <strong className="text-foreground">월 5회</strong>로 제한됩니다.
            3개 이상의 평가가 쌓이면 브론즈→실버→골드→플래티넘 티어가 부여됩니다.
          </span>
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
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-warm text-warm" />
                    <span className="font-medium">{place.avg_rating.toFixed(1)}</span>
                    <span className="text-muted">({place.rating_count})</span>
                  </div>
                </div>
                <CardTitle className="mt-3">{place.name}</CardTitle>
                <CardDescription>{place.address}</CardDescription>
                {place.category && (
                  <span className="mt-2 inline-block text-xs text-muted">{place.category}</span>
                )}
                {place.recommender_title && (
                  <p className="mt-2 text-xs text-primary">
                    추천: {place.recommender_title}
                  </p>
                )}

                {ratingPlace === place.id ? (
                  <div className="mt-4 flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button
                        key={r}
                        onClick={() => setRating(r)}
                        className={`rounded-lg p-1 ${rating >= r ? "text-warm" : "text-muted/30"}`}
                      >
                        <Star className={`h-5 w-5 ${rating >= r ? "fill-warm" : ""}`} />
                      </button>
                    ))}
                    <Button size="sm" onClick={() => handleRate(place.id)}>평가</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" className="mt-4" onClick={() => setRatingPlace(place.id)}>
                    <Star className="h-3.5 w-3.5" /> 평가하기
                  </Button>
                )}
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
