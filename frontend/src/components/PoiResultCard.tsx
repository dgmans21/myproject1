"use client";

import Link from "next/link";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { KakaoMapLinks } from "@/components/KakaoMapLinks";
import { KakaoPoiResult } from "@/lib/kakao-map";
import { Place, TIER_LABELS } from "@/lib/api";
import { MapPin, Plus } from "lucide-react";

export function PoiResultCard({
  poi,
  matchedPlace,
  className,
}: {
  poi: KakaoPoiResult;
  matchedPlace?: Place;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {matchedPlace ? (
            <Badge variant="tier" tier={matchedPlace.tier}>
              {TIER_LABELS[matchedPlace.tier]}
            </Badge>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-0.5 text-xs text-muted">
              <MapPin className="h-3 w-3" /> 카카오맵
            </span>
          )}
          <CardTitle className="mt-2">{poi.name}</CardTitle>
          <CardDescription>{poi.address}</CardDescription>
          {poi.distanceMeters != null && (
            <p className="mt-1 text-xs text-muted">
              검색 기준 약 {(poi.distanceMeters / 1000).toFixed(1)}km
            </p>
          )}
          {matchedPlace?.past_travel_hint && (
            <p className="mt-2 text-xs text-accent">{matchedPlace.past_travel_hint}</p>
          )}
        </div>
        <KakaoMapLinks
          place={{
            name: poi.name,
            lat: poi.lat,
            lng: poi.lng,
            kakao_place_id: poi.id,
          }}
        />
      </div>
      {!matchedPlace && (
        <Link href="/places" className="mt-4 inline-block">
          <Button size="sm" variant="secondary">
            <Plus className="h-3.5 w-3.5" /> 맛집으로 등록하기
          </Button>
        </Link>
      )}
    </Card>
  );
}
