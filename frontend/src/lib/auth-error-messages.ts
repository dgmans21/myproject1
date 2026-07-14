/** Supabase Auth 오류 → 사용자용 한글 (원문 메시지는 노출하지 않음) */

const BY_CODE: Record<string, string> = {
  invalid_credentials: "이메일 또는 비밀번호가 올바르지 않습니다.",
  email_not_confirmed: "이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해 주세요.",
  user_already_registered: "이미 가입된 이메일입니다.",
  weak_password: "비밀번호는 6자 이상이어야 합니다.",
  same_password: "새 비밀번호는 기존 비밀번호와 달라야 합니다.",
  over_email_send_rate_limit: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  over_request_rate_limit: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  email_address_invalid: "테스트용 이메일 도메인은 사용할 수 없습니다. Gmail 등 실제 이메일을 사용해 주세요.",
  signup_disabled: "현재 회원가입이 허용되지 않습니다.",
  user_not_found: "가입되지 않은 이메일입니다.",
  session_not_found: "로그인 세션이 만료되었습니다. 다시 로그인해 주세요.",
  refresh_token_not_found: "로그인 세션이 만료되었습니다. 다시 로그인해 주세요.",
  flow_state_expired: "인증 링크가 만료되었습니다. 다시 요청해 주세요.",
  otp_expired: "인증 링크가 만료되었습니다. 다시 요청해 주세요.",
};

const BY_MESSAGE: [RegExp, string][] = [
  [/invalid login credentials/i, "이메일 또는 비밀번호가 올바르지 않습니다."],
  [/email not confirmed/i, "이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해 주세요."],
  [/user already registered/i, "이미 가입된 이메일입니다."],
  [/password should be at least/i, "비밀번호는 6자 이상이어야 합니다."],
  [/unable to validate email/i, "이메일 형식이 올바르지 않습니다."],
  [/invalid email/i, "이메일 형식이 올바르지 않습니다."],
  [/rate limit/i, "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."],
  [/only request this after/i, "보안을 위해 잠시 후 다시 시도해 주세요."],
  [/token has expired|invalid.*token|otp expired/i, "링크가 만료되었거나 유효하지 않습니다. 다시 요청해 주세요."],
  [/signup.*not allowed/i, "현재 회원가입이 허용되지 않습니다."],
  [/new password should be different/i, "새 비밀번호는 기존 비밀번호와 달라야 합니다."],
];

type AuthErrorContext = "login" | "signup" | "forgot-password" | "reset-password" | "oauth";

const FALLBACK: Record<AuthErrorContext, string> = {
  login: "로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.",
  signup: "회원가입에 실패했습니다. 입력 정보를 확인해 주세요.",
  "forgot-password": "재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.",
  "reset-password": "비밀번호 변경에 실패했습니다. 링크가 만료됐을 수 있습니다.",
  oauth: "소셜 로그인에 실패했습니다. 다시 시도해 주세요.",
};

function extractAuthError(err: unknown): { code?: string; message?: string } {
  if (!err || typeof err !== "object") return {};
  const e = err as { code?: string; message?: string };
  return { code: e.code, message: e.message };
}

function mapKnownError(code?: string, message?: string): string | null {
  if (code && BY_CODE[code]) return BY_CODE[code];

  const normalized = message?.trim();
  if (!normalized) return null;

  for (const [pattern, korean] of BY_MESSAGE) {
    if (pattern.test(normalized)) return korean;
  }

  return null;
}

/** Supabase/Auth 오류를 한글 메시지로 변환. 매칭 실패 시 context별 기본 문구만 반환 */
export function toAuthErrorMessage(
  err: unknown,
  context: AuthErrorContext = "login",
): string {
  const { code, message } = extractAuthError(err);
  return mapKnownError(code, message) ?? FALLBACK[context];
}
