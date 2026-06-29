import { normalizeInterestEmojis } from "@/lib/profile-interests";

export type ChineseZodiacId =
  | "RAT"
  | "OX"
  | "TIGER"
  | "RABBIT"
  | "DRAGON"
  | "SNAKE"
  | "HORSE"
  | "GOAT"
  | "MONKEY"
  | "ROOSTER"
  | "DOG"
  | "PIG";

export type WesternZodiacId =
  | "ARIES"
  | "TAURUS"
  | "GEMINI"
  | "CANCER"
  | "LEO"
  | "VIRGO"
  | "LIBRA"
  | "SCORPIO"
  | "SAGITTARIUS"
  | "CAPRICORN"
  | "AQUARIUS"
  | "PISCES";

export type BloodTypeId = "A" | "B" | "O" | "AB";

export interface ProfileDecorEntry<T extends string = string> {
  id: T;
  labelKo: string;
  emoji: string;
}

export const CHINESE_ZODIAC_ICONS: Record<ChineseZodiacId, ProfileDecorEntry<ChineseZodiacId>> = {
  RAT: { id: "RAT", labelKo: "쥐", emoji: "🐭" },
  OX: { id: "OX", labelKo: "소", emoji: "🐂" },
  TIGER: { id: "TIGER", labelKo: "호랑이", emoji: "🐯" },
  RABBIT: { id: "RABBIT", labelKo: "토끼", emoji: "🐰" },
  DRAGON: { id: "DRAGON", labelKo: "용", emoji: "🐲" },
  SNAKE: { id: "SNAKE", labelKo: "뱀", emoji: "🐍" },
  HORSE: { id: "HORSE", labelKo: "말", emoji: "🐴" },
  GOAT: { id: "GOAT", labelKo: "양", emoji: "🐑" },
  MONKEY: { id: "MONKEY", labelKo: "원숭이", emoji: "🐵" },
  ROOSTER: { id: "ROOSTER", labelKo: "닭", emoji: "🐓" },
  DOG: { id: "DOG", labelKo: "개", emoji: "🐕" },
  PIG: { id: "PIG", labelKo: "돼지", emoji: "🐷" },
};

export const WESTERN_ZODIAC_ICONS: Record<WesternZodiacId, ProfileDecorEntry<WesternZodiacId>> = {
  ARIES: { id: "ARIES", labelKo: "양자리", emoji: "♈" },
  TAURUS: { id: "TAURUS", labelKo: "황소자리", emoji: "♉" },
  GEMINI: { id: "GEMINI", labelKo: "쌍둥이자리", emoji: "♊" },
  CANCER: { id: "CANCER", labelKo: "게자리", emoji: "♋" },
  LEO: { id: "LEO", labelKo: "사자자리", emoji: "♌" },
  VIRGO: { id: "VIRGO", labelKo: "처녀자리", emoji: "♍" },
  LIBRA: { id: "LIBRA", labelKo: "천칭자리", emoji: "♎" },
  SCORPIO: { id: "SCORPIO", labelKo: "전갈자리", emoji: "♏" },
  SAGITTARIUS: { id: "SAGITTARIUS", labelKo: "사수자리", emoji: "♐" },
  CAPRICORN: { id: "CAPRICORN", labelKo: "염소자리", emoji: "♑" },
  AQUARIUS: { id: "AQUARIUS", labelKo: "물병자리", emoji: "♒" },
  PISCES: { id: "PISCES", labelKo: "물고기자리", emoji: "♓" },
};

export const BLOOD_TYPE_ICONS: Record<BloodTypeId, ProfileDecorEntry<BloodTypeId>> = {
  A: { id: "A", labelKo: "A형", emoji: "🅰️" },
  B: { id: "B", labelKo: "B형", emoji: "🅱️" },
  O: { id: "O", labelKo: "O형", emoji: "🅾️" },
  AB: { id: "AB", labelKo: "AB형", emoji: "🆎" },
};

export const CHINESE_ZODIAC_OPTIONS = Object.values(CHINESE_ZODIAC_ICONS);
export const WESTERN_ZODIAC_OPTIONS = Object.values(WESTERN_ZODIAC_ICONS);
export const BLOOD_TYPE_OPTIONS = Object.values(BLOOD_TYPE_ICONS);

/** API·DB 저장용 (snake_case, 짧은 코드 + 테마 문자열) */
export interface ProfileDecorFields {
  chinese_zodiac?: ChineseZodiacId;
  western_zodiac?: WesternZodiacId;
  blood_type?: BloodTypeId;
  /** 프로필 강조색 #RRGGBB */
  accent_color?: string;
  /** CSS 템플릿 ID (프리셋 키만 저장) */
  theme_preset?: ProfileThemePresetId;
  /** 취미·관심 — 유니코드 이모지 문자 배열 (자유 입력) */
  interest_emojis?: string[];
}

export interface ProfileDecorSelection {
  chineseZodiac?: ChineseZodiacId;
  westernZodiac?: WesternZodiacId;
  bloodType?: BloodTypeId;
  accentColor?: string;
  themePreset?: ProfileThemePresetId;
  interestEmojis?: string[];
}

export function selectionToFields(sel: ProfileDecorSelection): ProfileDecorFields {
  return {
    chinese_zodiac: sel.chineseZodiac,
    western_zodiac: sel.westernZodiac,
    blood_type: sel.bloodType,
    accent_color: sel.accentColor,
    theme_preset: sel.themePreset,
    interest_emojis: normalizeInterestEmojis(sel.interestEmojis ?? []),
  };
}

export function fieldsToSelection(fields?: ProfileDecorFields | null): ProfileDecorSelection {
  if (!fields) return {};
  return {
    chineseZodiac: fields.chinese_zodiac,
    westernZodiac: fields.western_zodiac,
    bloodType: fields.blood_type,
    accentColor: fields.accent_color,
    themePreset: fields.theme_preset,
    interestEmojis: normalizeInterestEmojis(fields.interest_emojis ?? []),
  };
}

export function hasProfileDecor(fields?: ProfileDecorFields | null): boolean {
  return Boolean(
    fields?.chinese_zodiac ||
      fields?.western_zodiac ||
      fields?.blood_type ||
      (fields?.interest_emojis && fields.interest_emojis.length > 0)
  );
}

export function getChineseZodiacIcon(id?: ChineseZodiacId | null) {
  return id ? CHINESE_ZODIAC_ICONS[id] : undefined;
}

export function getWesternZodiacIcon(id?: WesternZodiacId | null) {
  return id ? WESTERN_ZODIAC_ICONS[id] : undefined;
}

export function getBloodTypeIcon(id?: BloodTypeId | null) {
  return id ? BLOOD_TYPE_ICONS[id] : undefined;
}

/** 방 멤버 목록 등 — 닉네임 옆 꾸미기 이모지 표시 상한 */
export const MEMBER_DECOR_DISPLAY_LIMIT = 10;

export interface ProfileDecorDisplayItem {
  key: string;
  emoji: string;
  label: string;
}

/** 12간지 → 별자리 → 혈액형 → 취미·관심 순 */
export function listProfileDecorDisplayItems(
  fields?: ProfileDecorFields | null
): ProfileDecorDisplayItem[] {
  if (!fields) return [];

  const items: ProfileDecorDisplayItem[] = [];

  const chinese = getChineseZodiacIcon(fields.chinese_zodiac);
  if (chinese) items.push({ key: chinese.id, emoji: chinese.emoji, label: chinese.labelKo });

  const western = getWesternZodiacIcon(fields.western_zodiac);
  if (western) items.push({ key: western.id, emoji: western.emoji, label: western.labelKo });

  const blood = getBloodTypeIcon(fields.blood_type);
  if (blood) items.push({ key: blood.id, emoji: blood.emoji, label: blood.labelKo });

  for (const emoji of normalizeInterestEmojis(fields.interest_emojis ?? [])) {
    items.push({ key: `interest-${emoji}`, emoji, label: "취미·관심" });
  }

  return items;
}

/** 화면 표시용 이모지 나열 (닉네임 옆) */
export function profileDecorEmojis(fields?: ProfileDecorFields | null): string[] {
  return listProfileDecorDisplayItems(fields).map((item) => item.emoji);
}

// --- 테마 프리셋 (DB에는 theme_preset ID 문자열만) ---

export const PROFILE_THEME_PRESET_IDS = [
  "default",
  "warm",
  "ocean",
  "forest",
  "sunset",
  "minimal",
  "lavender",
  "peach",
  "mint",
  "berry",
  "lemon",
  "sky",
] as const;

export type ProfileThemePresetId = (typeof PROFILE_THEME_PRESET_IDS)[number];

export function isValidProfileThemePreset(id: string | undefined | null): id is ProfileThemePresetId {
  return Boolean(id && PROFILE_THEME_PRESET_IDS.includes(id as ProfileThemePresetId));
}
