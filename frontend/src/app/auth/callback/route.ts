import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    const home = new URL("/", requestUrl.origin);
    home.searchParams.set("auth_error", error.message);
    home.hash = "auth";
    return NextResponse.redirect(home);
  }

  const oauthError =
    requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");
  if (oauthError) {
    const home = new URL("/", requestUrl.origin);
    home.searchParams.set("auth_error", oauthError);
    home.hash = "auth";
    return NextResponse.redirect(home);
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
