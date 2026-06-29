import type { CSSProperties } from "react";
import type { ProfileDecorFields, ProfileThemePresetId } from "@/lib/profile-decor-icons";
import { isValidRoomAccent } from "@/lib/room-accent";

export { ROOM_ACCENT_PRESETS as PROFILE_ACCENT_PRESETS } from "@/lib/room-accent";

export interface ProfileThemePreset {
  id: ProfileThemePresetId;
  label: string;
  defaultAccent: string;
  cardClassName: string;
}

export const PROFILE_THEME_PRESETS: ProfileThemePreset[] = [
  { id: "default", label: "기본", defaultAccent: "#6366F1", cardClassName: "bg-card" },
  {
    id: "warm",
    label: "웜",
    defaultAccent: "#FBBF24",
    cardClassName: "bg-gradient-to-br from-amber-50/90 to-orange-50/50 dark:from-amber-950/25 dark:to-orange-950/15",
  },
  {
    id: "ocean",
    label: "오션",
    defaultAccent: "#22D3EE",
    cardClassName: "bg-gradient-to-br from-cyan-50/90 to-blue-50/50 dark:from-cyan-950/25 dark:to-blue-950/15",
  },
  {
    id: "forest",
    label: "포레스트",
    defaultAccent: "#34D399",
    cardClassName: "bg-gradient-to-br from-emerald-50/90 to-lime-50/40 dark:from-emerald-950/25 dark:to-lime-950/15",
  },
  {
    id: "sunset",
    label: "선셋",
    defaultAccent: "#FB7185",
    cardClassName: "bg-gradient-to-br from-rose-50/90 to-violet-50/40 dark:from-rose-950/25 dark:to-violet-950/15",
  },
  {
    id: "minimal",
    label: "미니멀",
    defaultAccent: "#94A3B8",
    cardClassName: "bg-surface/70",
  },
  {
    id: "lavender",
    label: "라벤더",
    defaultAccent: "#818CF8",
    cardClassName: "bg-gradient-to-br from-violet-50/90 to-indigo-50/40 dark:from-violet-950/25 dark:to-indigo-950/15",
  },
  {
    id: "peach",
    label: "피치",
    defaultAccent: "#F87171",
    cardClassName: "bg-gradient-to-br from-red-50/80 to-orange-50/40 dark:from-red-950/20 dark:to-orange-950/15",
  },
  {
    id: "mint",
    label: "민트",
    defaultAccent: "#2DD4BF",
    cardClassName: "bg-gradient-to-br from-teal-50/90 to-emerald-50/40 dark:from-teal-950/25 dark:to-emerald-950/15",
  },
  {
    id: "berry",
    label: "베리",
    defaultAccent: "#E879F9",
    cardClassName: "bg-gradient-to-br from-fuchsia-50/90 to-pink-50/40 dark:from-fuchsia-950/25 dark:to-pink-950/15",
  },
  {
    id: "lemon",
    label: "레몬",
    defaultAccent: "#A3E635",
    cardClassName: "bg-gradient-to-br from-lime-50/90 to-yellow-50/40 dark:from-lime-950/25 dark:to-yellow-950/15",
  },
  {
    id: "sky",
    label: "스카이",
    defaultAccent: "#60A5FA",
    cardClassName: "bg-gradient-to-br from-sky-50/90 to-blue-50/40 dark:from-sky-950/25 dark:to-blue-950/15",
  },
];

export function getProfileThemePreset(id?: ProfileThemePresetId | null): ProfileThemePreset {
  return PROFILE_THEME_PRESETS.find((p) => p.id === id) ?? PROFILE_THEME_PRESETS[0];
}

export function resolveProfileThemeStyle(decor?: ProfileDecorFields | null): {
  className: string;
  style: CSSProperties;
  accent: string;
} {
  const preset = getProfileThemePreset(decor?.theme_preset ?? "default");
  const accent =
    decor?.accent_color && isValidRoomAccent(decor.accent_color)
      ? decor.accent_color
      : preset.defaultAccent;

  return {
    className: preset.cardClassName,
    accent,
    style: {
      ["--profile-accent" as string]: accent,
      borderColor: `${accent}55`,
      boxShadow: `inset 4px 0 0 0 ${accent}`,
    },
  };
}
