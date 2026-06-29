"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { ProfileDecorIcon } from "@/components/ProfileDecorIcon";
import { ProfileThemeShell } from "@/components/ProfileThemeShell";
import {
  BLOOD_TYPE_OPTIONS,
  CHINESE_ZODIAC_OPTIONS,
  ProfileDecorSelection,
  ProfileThemePresetId,
  WESTERN_ZODIAC_OPTIONS,
  fieldsToSelection,
  getBloodTypeIcon,
  getChineseZodiacIcon,
  getWesternZodiacIcon,
  selectionToFields,
} from "@/lib/profile-decor-icons";
import { PROFILE_THEME_PRESETS, resolveProfileThemeStyle } from "@/lib/profile-theme";
import { normalizeRoomAccent } from "@/lib/room-accent";
import { api, Profile } from "@/lib/api";
import { Sparkles } from "lucide-react";

function DecorPicker<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: readonly { id: T; labelKo: string; emoji: string }[];
  value?: T;
  onChange: (id: T) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((entry) => {
          const selected = value === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onChange(entry.id as T)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition-colors ${
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted hover:border-primary/40"
              }`}
              title={entry.labelKo}
            >
              <span className="text-base leading-none" aria-hidden>
                {entry.emoji}
              </span>
              {entry.labelKo}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ProfileDecorPanelProps {
  onUpdated?: (profile: Profile) => void;
}

export function ProfileDecorPanel({ onUpdated }: ProfileDecorPanelProps) {
  const [selection, setSelection] = useState<ProfileDecorSelection>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.profiles.me().then((p) => setSelection(fieldsToSelection(p.profile_decor))).catch(() => {});
  }, []);

  const persist = async (next: ProfileDecorSelection) => {
    const prev = selection;
    setSelection(next);
    setSaving(true);
    try {
      const updated = await api.profiles.update({ profile_decor: selectionToFields(next) });
      onUpdated?.(updated);
    } catch (err) {
      setSelection(prev);
      alert(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const update = (patch: Partial<ProfileDecorSelection>) => {
    persist({ ...selection, ...patch });
  };

  const chinese = getChineseZodiacIcon(selection.chineseZodiac);
  const western = getWesternZodiacIcon(selection.westernZodiac);
  const blood = getBloodTypeIcon(selection.bloodType);
  const previewDecor = selectionToFields(selection);
  const previewAccent = resolveProfileThemeStyle(previewDecor).accent;

  const setAccentPreview = (hex: string) => {
    setSelection((prev) => ({ ...prev, accentColor: hex }));
  };

  const saveAccent = (hex: string) => {
    const normalized = normalizeRoomAccent(hex);
    if (!normalized) return;
    persist({ ...selection, accentColor: normalized });
  };

  return (
    <Card className="mt-6">
      <CardTitle className="flex items-center gap-2 text-base">
        <Sparkles className="h-4 w-4 text-primary" /> 마이페이지 꾸미기
      </CardTitle>
      <CardDescription className="mt-1">
        12간지 · 별자리 · 혈액형과 프로필 색·테마를 설정할 수 있어요.
      </CardDescription>

      <ProfileThemeShell decor={previewDecor} className="mt-4 p-4">
        <p className="text-xs text-muted">테마 미리보기</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="font-semibold inline-flex items-center gap-1" style={{ color: previewAccent }}>
            닉네임
            {chinese && (
              <span className="text-base" aria-hidden>
                {chinese.emoji}
              </span>
            )}
            {western && (
              <span className="text-base" aria-hidden>
                {western.emoji}
              </span>
            )}
            {blood && (
              <span className="text-base" aria-hidden>
                {blood.emoji}
              </span>
            )}
          </span>
        </div>
        {(chinese || western || blood) && (
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {chinese && <ProfileDecorIcon entry={chinese} showLabel />}
            {western && <ProfileDecorIcon entry={western} showLabel />}
            {blood && <ProfileDecorIcon entry={blood} showLabel />}
          </div>
        )}
      </ProfileThemeShell>

      <div className="mt-6 space-y-6">
        <DecorPicker
          title="12간지 (띠)"
          options={CHINESE_ZODIAC_OPTIONS}
          value={selection.chineseZodiac}
          onChange={(id) => update({ chineseZodiac: id })}
        />
        <DecorPicker
          title="별자리"
          options={WESTERN_ZODIAC_OPTIONS}
          value={selection.westernZodiac}
          onChange={(id) => update({ westernZodiac: id })}
        />
        <DecorPicker
          title="혈액형"
          options={BLOOD_TYPE_OPTIONS}
          value={selection.bloodType}
          onChange={(id) => update({ bloodType: id })}
        />

        <div>
          <p className="text-sm font-medium text-foreground">프로필 강조색</p>
          <p className="mt-1 text-xs text-muted">닉네임·프로필 카드 왼쪽 강조선에 적용됩니다</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="relative inline-flex h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border shadow-sm">
              <span
                className="absolute inset-0"
                style={{ backgroundColor: previewAccent }}
                aria-hidden
              />
              <input
                type="color"
                value={previewAccent}
                onInput={(e) => setAccentPreview(e.currentTarget.value.toUpperCase())}
                onChange={(e) => saveAccent(e.currentTarget.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="프로필 강조색 선택"
              />
            </label>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <input
                type="text"
                value={selection.accentColor ?? previewAccent}
                onChange={(e) => setAccentPreview(e.target.value)}
                onBlur={(e) => {
                  const normalized = normalizeRoomAccent(e.target.value);
                  if (normalized) saveAccent(e.target.value);
                  else setAccentPreview(previewAccent);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveAccent(e.currentTarget.value);
                  }
                }}
                placeholder="#RRGGBB"
                className="w-full min-w-[7rem] max-w-[8.5rem] rounded-xl border border-border bg-card px-3 py-2 font-mono text-sm uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                spellCheck={false}
              />
              <span
                className="hidden h-9 w-9 shrink-0 rounded-lg border border-border sm:inline-block"
                style={{ backgroundColor: previewAccent }}
                aria-hidden
              />
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">테마</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PROFILE_THEME_PRESETS.map((preset) => {
              const selected = (selection.themePreset ?? "default") === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => update({ themePreset: preset.id as ProfileThemePresetId })}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                    selected
                      ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                      : "border-border text-muted hover:border-primary/40"
                  }`}
                >
                  <span
                    className={`h-5 w-8 shrink-0 rounded-md border border-black/5 ${preset.cardClassName}`}
                    style={{ boxShadow: `inset 2px 0 0 0 ${previewAccent}` }}
                    aria-hidden
                  />
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {saving && <p className="mt-4 text-xs text-muted">저장 중...</p>}
    </Card>
  );
}
