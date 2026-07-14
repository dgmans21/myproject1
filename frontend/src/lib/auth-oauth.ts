import { createClient } from "@/lib/supabase/client";
import type { AuthSocialProvider } from "@/lib/auth-ui-constants";
import { clearGuestSession } from "@/lib/auth-session";
import { getApiBaseUrl } from "@/lib/api-config";

export function authCallbackUrl(next = "/dashboard"): string {
  const origin = window.location.origin;
  const params = new URLSearchParams({ next });
  return `${origin}/auth/callback?${params.toString()}`;
}

/** Google / Kakao: Supabase OAuth. Naver: FastAPI OAuth 시작 */
export async function startSocialLogin(provider: AuthSocialProvider): Promise<void> {
  clearGuestSession();

  if (provider === "naver") {
    const api = getApiBaseUrl();
    const params = new URLSearchParams({
      frontend_origin: window.location.origin,
    });
    window.location.assign(`${api}/api/v1/auth/naver?${params.toString()}`);
    return;
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: authCallbackUrl("/dashboard"),
    },
  });
  if (error) throw error;
}
