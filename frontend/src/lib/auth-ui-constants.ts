/** 회원가입·Supabase metadata와 맞춘 나이대 (DB age_group enum) */
export const AUTH_AGE_OPTIONS = [
  { value: "TEENS", label: "10대" },
  { value: "TWENTIES", label: "20대" },
  { value: "THIRTIES", label: "30대" },
  { value: "FORTIES", label: "40대" },
  { value: "FIFTIES", label: "50대" },
  { value: "SIXTIES", label: "60대" },
  { value: "SEVENTIES", label: "70대" },
  { value: "EIGHTIES_PLUS", label: "80대 이상" },
] as const;

export type AuthAgeGroup = (typeof AUTH_AGE_OPTIONS)[number]["value"];

export type AuthSocialProvider = "google" | "kakao" | "naver";

export const AUTH_SOCIAL_PROVIDERS: {
  id: AuthSocialProvider;
  label: string;
  /** Supabase 내장 provider. naver는 앱 전용 라우트 */
  supabaseProvider: "google" | "kakao" | null;
  className: string;
}[] = [
  {
    id: "google",
    label: "Google로 계속하기",
    supabaseProvider: "google",
    className:
      "border border-border bg-card text-foreground hover:bg-surface",
  },
  {
    id: "kakao",
    label: "카카오로 계속하기",
    supabaseProvider: "kakao",
    className: "bg-[#FEE500] text-[#191919] hover:bg-[#F5DC00] border border-[#F0D500]",
  },
  {
    id: "naver",
    label: "네이버로 계속하기",
    supabaseProvider: null,
    className: "bg-[#03C75A] text-white hover:bg-[#02B350] border border-[#02A84E]",
  },
];
