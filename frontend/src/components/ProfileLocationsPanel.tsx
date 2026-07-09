"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api, Profile, SavedLocation } from "@/lib/api";
import { geocodeAddress } from "@/lib/kakao-map";
import { useDepartureOriginOptional } from "@/lib/departure-origin-context";
import { Loader2, MapPin, Trash2 } from "lucide-react";

const MAX_SAVED = 5;

export function ProfileLocationsPanel({
  profile,
  onProfileUpdated,
}: {
  profile: Profile;
  onProfileUpdated: (p: Profile) => void;
}) {
  const departureCtx = useDepartureOriginOptional();
  const [saved, setSaved] = useState<SavedLocation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [homeQuery, setHomeQuery] = useState(profile.home_address ?? "");
  const [homeGeocoding, setHomeGeocoding] = useState(false);

  const [addLabel, setAddLabel] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addQuery, setAddQuery] = useState("");
  const [addGeocoding, setAddGeocoding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.savedLocations
      .list()
      .then(setSaved)
      .catch(() => setSaved([]))
      .finally(() => setLoaded(true));
  }, []);

  const saveHome = async () => {
    const q = homeQuery.trim();
    if (!q) {
      alert("집 주소를 입력해 주세요");
      return;
    }
    setHomeGeocoding(true);
    try {
      const coords = await geocodeAddress(q);
      if (!coords) {
        alert("주소를 찾을 수 없습니다");
        return;
      }
      setSaving(true);
      const updated = await api.profiles.update({
        home_address: coords.name ?? q,
        home_lat: coords.lat,
        home_lng: coords.lng,
      });
      onProfileUpdated(updated);
      setHomeQuery(updated.home_address ?? q);
      void departureCtx?.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "집 주소 저장 실패");
    } finally {
      setHomeGeocoding(false);
      setSaving(false);
    }
  };

  const addSaved = async () => {
    const label = addLabel.trim();
    const q = addQuery.trim();
    if (!label || !q) {
      alert("라벨과 주소를 입력해 주세요");
      return;
    }
    setAddGeocoding(true);
    try {
      const coords = await geocodeAddress(q);
      if (!coords) {
        alert("주소를 찾을 수 없습니다");
        return;
      }
      const row = await api.savedLocations.create({
        label,
        description: addDescription.trim().slice(0, 10) || undefined,
        address: coords.name ?? q,
        lat: coords.lat,
        lng: coords.lng,
        is_default: saved.length === 0,
      });
      setSaved((prev) => [...prev, row]);
      setAddLabel("");
      setAddDescription("");
      setAddQuery("");
      setShowAdd(false);
      void departureCtx?.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setAddGeocoding(false);
    }
  };

  const setDefault = async (id: string) => {
    try {
      const updated = await api.savedLocations.update(id, { is_default: true });
      setSaved((prev) =>
        prev.map((s) => ({ ...s, is_default: s.id === updated.id }))
      );
      void departureCtx?.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "기본값 설정 실패");
    }
  };

  const removeSaved = async (id: string) => {
    if (!confirm("이 장소를 삭제할까요?")) return;
    try {
      await api.savedLocations.delete(id);
      setSaved((prev) => prev.filter((s) => s.id !== id));
      void departureCtx?.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 실패");
    }
  };

  const homeChanged = homeQuery.trim() !== (profile.home_address ?? "").trim();

  return (
    <>
      <Card className="mt-6">
        <CardTitle className="text-base">집 · 공개 거주지</CardTitle>
        <CardDescription className="mt-1">
          집은 경로·이동시간의 기본 출발지입니다. 저장 시 프로필에 표시되는 거주지(시/구)가
          자동으로 갱신됩니다.
        </CardDescription>
        <p className="mt-3 text-sm">
          공개 거주지: <strong className="text-foreground">{profile.residence}</strong>
        </p>
        <div className="mt-4 space-y-2">
          <Input
            label="집 주소"
            value={homeQuery}
            onChange={(e) => setHomeQuery(e.target.value)}
            placeholder="서울 강남구 …"
          />
          <Button
            size="sm"
            disabled={homeGeocoding || saving || !homeChanged}
            onClick={() => void saveHome()}
          >
            {homeGeocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            집 주소 저장
          </Button>
        </div>
      </Card>

      <Card className="mt-6">
        <CardTitle className="text-base">저장된 장소</CardTitle>
        <CardDescription className="mt-1">
          회사·자주 가는 곳 등 (최대 {MAX_SAVED}개, 집 제외)
        </CardDescription>

        {saved.length === 0 && loaded && (
          <p className="mt-4 text-sm text-muted">등록된 장소가 없습니다</p>
        )}

        <ul className="mt-4 space-y-2">
          {saved.map((loc) => (
            <li
              key={loc.id}
              className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{loc.label}</span>
                  {loc.is_default && (
                    <span className="text-xs text-primary">기본 출발지</span>
                  )}
                  {loc.description && (
                    <span className="text-xs text-muted">{loc.description}</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted line-clamp-2">{loc.address}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {!loc.is_default && (
                  <Button size="sm" variant="secondary" onClick={() => void setDefault(loc.id)}>
                    기본으로
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => void removeSaved(loc.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>

        {saved.length < MAX_SAVED && (
          <>
            {!showAdd ? (
              <Button className="mt-4" size="sm" variant="secondary" onClick={() => setShowAdd(true)}>
                장소 추가
              </Button>
            ) : (
              <div className="mt-4 space-y-3 rounded-xl border border-border p-4">
                <Input
                  label="라벨"
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  placeholder="회사, 부모님댁…"
                />
                <Input
                  label="설명 (10자 이내, 선택)"
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value.slice(0, 10))}
                  placeholder="지하 1층"
                />
                <Input
                  label="주소 검색"
                  value={addQuery}
                  onChange={(e) => setAddQuery(e.target.value)}
                  placeholder="주소 입력 후 추가"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void addSaved()} disabled={addGeocoding}>
                    {addGeocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    저장
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                    취소
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {saved.length >= MAX_SAVED && (
          <p className="mt-4 text-xs text-muted">저장 장소는 최대 {MAX_SAVED}개까지 등록할 수 있습니다.</p>
        )}
      </Card>
    </>
  );
}
