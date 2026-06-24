"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { ProfileDecorIcon } from "@/components/ProfileDecorIcon";
import {
  BLOOD_TYPE_OPTIONS,
  CHINESE_ZODIAC_OPTIONS,
  ProfileDecorSelection,
  WESTERN_ZODIAC_OPTIONS,
  getBloodTypeIcon,
  getChineseZodiacIcon,
  getWesternZodiacIcon,
} from "@/lib/profile-decor-icons";
import { Sparkles } from "lucide-react";

const STORAGE_KEY = "profile-decor-local";

function loadSelection(): ProfileDecorSelection {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProfileDecorSelection) : {};
  } catch {
    return {};
  }
}

function saveSelection(selection: ProfileDecorSelection) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
}

function DecorPicker<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: readonly { id: T; labelKo: string; tintClass: string; icon: import("lucide-react").LucideIcon }[];
  value?: T;
  onChange: (id: T) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((entry) => {
          const selected = value === entry.id;
          const Icon = entry.icon;
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
              <Icon size={16} className={entry.tintClass} />
              {entry.labelKo}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 본인 마이페이지 전용 — localStorage 저장, 타인에게 노출되지 않음 */
export function ProfileDecorPanel() {
  const [selection, setSelection] = useState<ProfileDecorSelection>({});

  useEffect(() => {
    setSelection(loadSelection());
  }, []);

  const update = (patch: Partial<ProfileDecorSelection>) => {
    setSelection((prev) => {
      const next = { ...prev, ...patch };
      saveSelection(next);
      return next;
    });
  };

  const chinese = getChineseZodiacIcon(selection.chineseZodiac);
  const western = getWesternZodiacIcon(selection.westernZodiac);
  const blood = getBloodTypeIcon(selection.bloodType);

  return (
    <Card className="mt-6">
      <CardTitle className="flex items-center gap-2 text-base">
        <Sparkles className="h-4 w-4 text-primary" /> 마이페이지 꾸미기
      </CardTitle>
      <CardDescription className="mt-1">
        12간지 · 별자리 · 혈액형 아이콘은 본인 프로필에서만 보입니다 (기기 localStorage 저장).
      </CardDescription>

      {(chinese || western || blood) && (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-surface px-4 py-3">
          <span className="text-xs text-muted">미리보기</span>
          {chinese && <ProfileDecorIcon entry={chinese} showLabel />}
          {western && <ProfileDecorIcon entry={western} showLabel />}
          {blood && <ProfileDecorIcon entry={blood} showLabel />}
        </div>
      )}

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
      </div>
    </Card>
  );
}
