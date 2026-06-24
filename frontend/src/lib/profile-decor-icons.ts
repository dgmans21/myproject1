/**
 * 마이페이지 꾸미기 전용 아이콘 매핑 (본인만 보는 UI).
 * lucide-react + 커스텀 12간지 SVG (외부 CDN 없음).
 */
import type { LucideIcon } from "lucide-react";
import {
  Rat,
  Rabbit,
  Worm,
  Dog,
  PiggyBank,
  ZodiacAries,
  ZodiacTaurus,
  ZodiacGemini,
  ZodiacCancer,
  ZodiacLeo,
  ZodiacVirgo,
  ZodiacLibra,
  ZodiacScorpio,
  ZodiacSagittarius,
  ZodiacCapricorn,
  ZodiacAquarius,
  ZodiacPisces,
  Droplet,
  Droplets,
  Circle,
  HeartPulse,
} from "lucide-react";
import {
  OxIcon,
  TigerIcon,
  DragonIcon,
  HorseIcon,
  SheepIcon,
  MonkeyIcon,
  RoosterIcon,
} from "@/components/icons";

export interface ProfileDecorEntry<T extends string = string> {
  id: T;
  /** 한글 표시명 */
  labelKo: string;
  icon: LucideIcon;
  /** 마이페이지 미리보기용 Tailwind 색상 */
  tintClass: string;
}

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

/** 12간지 — lucide 기본 + 커스텀 SVG (Ox~Rooster 7종) */
export const CHINESE_ZODIAC_ICONS: Record<
  ChineseZodiacId,
  ProfileDecorEntry<ChineseZodiacId>
> = {
  RAT: { id: "RAT", labelKo: "쥐", icon: Rat, tintClass: "text-slate-600" },
  OX: { id: "OX", labelKo: "소", icon: OxIcon, tintClass: "text-amber-700" },
  TIGER: { id: "TIGER", labelKo: "호랑이", icon: TigerIcon, tintClass: "text-orange-600" },
  RABBIT: { id: "RABBIT", labelKo: "토끼", icon: Rabbit, tintClass: "text-pink-400" },
  DRAGON: { id: "DRAGON", labelKo: "용", icon: DragonIcon, tintClass: "text-red-500" },
  SNAKE: { id: "SNAKE", labelKo: "뱀", icon: Worm, tintClass: "text-emerald-600" },
  HORSE: { id: "HORSE", labelKo: "말", icon: HorseIcon, tintClass: "text-blue-600" },
  GOAT: { id: "GOAT", labelKo: "양", icon: SheepIcon, tintClass: "text-lime-600" },
  MONKEY: { id: "MONKEY", labelKo: "원숭이", icon: MonkeyIcon, tintClass: "text-yellow-600" },
  ROOSTER: { id: "ROOSTER", labelKo: "닭", icon: RoosterIcon, tintClass: "text-sky-600" },
  DOG: { id: "DOG", labelKo: "개", icon: Dog, tintClass: "text-amber-600" },
  PIG: { id: "PIG", labelKo: "돼지", icon: PiggyBank, tintClass: "text-rose-400" },
};

/** 서양 12별자리 — lucide 전용 Zodiac* 아이콘 */
export const WESTERN_ZODIAC_ICONS: Record<
  WesternZodiacId,
  ProfileDecorEntry<WesternZodiacId>
> = {
  ARIES: { id: "ARIES", labelKo: "양자리", icon: ZodiacAries, tintClass: "text-red-500" },
  TAURUS: { id: "TAURUS", labelKo: "황소자리", icon: ZodiacTaurus, tintClass: "text-amber-700" },
  GEMINI: { id: "GEMINI", labelKo: "쌍둥이자리", icon: ZodiacGemini, tintClass: "text-violet-500" },
  CANCER: { id: "CANCER", labelKo: "게자리", icon: ZodiacCancer, tintClass: "text-cyan-600" },
  LEO: { id: "LEO", labelKo: "사자자리", icon: ZodiacLeo, tintClass: "text-orange-500" },
  VIRGO: { id: "VIRGO", labelKo: "처녀자리", icon: ZodiacVirgo, tintClass: "text-green-600" },
  LIBRA: { id: "LIBRA", labelKo: "천칭자리", icon: ZodiacLibra, tintClass: "text-indigo-500" },
  SCORPIO: { id: "SCORPIO", labelKo: "전갈자리", icon: ZodiacScorpio, tintClass: "text-purple-600" },
  SAGITTARIUS: {
    id: "SAGITTARIUS",
    labelKo: "사수자리",
    icon: ZodiacSagittarius,
    tintClass: "text-blue-600",
  },
  CAPRICORN: {
    id: "CAPRICORN",
    labelKo: "염소자리",
    icon: ZodiacCapricorn,
    tintClass: "text-stone-600",
  },
  AQUARIUS: {
    id: "AQUARIUS",
    labelKo: "물병자리",
    icon: ZodiacAquarius,
    tintClass: "text-sky-500",
  },
  PISCES: { id: "PISCES", labelKo: "물고기자리", icon: ZodiacPisces, tintClass: "text-teal-500" },
};

/** 혈액형 — 형태·의미로 구분 (A 한 방울, B 여러 방울, O 원형, AB 생명/복합) */
export const BLOOD_TYPE_ICONS: Record<BloodTypeId, ProfileDecorEntry<BloodTypeId>> = {
  A: { id: "A", labelKo: "A형", icon: Droplet, tintClass: "text-red-500" },
  B: { id: "B", labelKo: "B형", icon: Droplets, tintClass: "text-blue-500" },
  O: { id: "O", labelKo: "O형", icon: Circle, tintClass: "text-rose-500" },
  AB: { id: "AB", labelKo: "AB형", icon: HeartPulse, tintClass: "text-purple-500" },
};

/** UI 선택 순서용 배열 */
export const CHINESE_ZODIAC_OPTIONS = Object.values(CHINESE_ZODIAC_ICONS);
export const WESTERN_ZODIAC_OPTIONS = Object.values(WESTERN_ZODIAC_ICONS);
export const BLOOD_TYPE_OPTIONS = Object.values(BLOOD_TYPE_ICONS);

export interface ProfileDecorSelection {
  chineseZodiac?: ChineseZodiacId;
  westernZodiac?: WesternZodiacId;
  bloodType?: BloodTypeId;
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
