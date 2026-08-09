import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAuthNextPath } from "@/lib/auth-next";

/** FastAPI 네이버 콜백 후 token_hash 만 전달 — service_role 없음 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const next = safeAuthNextPath(requestUrl.searchParams.get("next"));

  if (!tokenHash) {
    const home = new URL("/", origin);
    home.searchParams.set("auth_error", "네이버 로그인 세션이 없습니다.");
    home.hash = "auth";
    return NextResponse.redirect(home);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });

  if (error) {
    const home = new URL("/", origin);
    home.searchParams.set("auth_error", error.message);
    home.hash = "auth";
    return NextResponse.redirect(home);
  }

  return NextResponse.redirect(new URL(next, origin));
}
