/** 회원가입·Supabase metadata와 맞춘 나이대 (DB age_group enum) */
export const AUTH_AGE_OPTIONS = [
  { value: "TEENS", label: "10대" },
  { value: "TWENTIES", label: "20대" },
  { value: "THIRTIES", label: "30대" },
  { value: "FORTIES", label: "40대" },
  { value: "FIFTIES_PLUS", label: "50대 이상" },
] as const;

export type AuthSocialProvider = "google" | "kakao";
// | "naver" — Supabase custom OIDC + Edge Function 필요, 보류

export const AUTH_SOCIAL_PROVIDERS: {
  id: AuthSocialProvider;
  label: string;
  supabaseProvider: string;
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
  // {
  //   id: "naver",
  //   label: "네이버로 계속하기",
  //   supabaseProvider: "custom:naver",
  //   className: "bg-[#03C75A] text-white hover:bg-[#02B350] border border-[#02A84E]",
  // },
];
