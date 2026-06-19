import { NextResponse, type NextRequest } from "next/server";

// --- Supabase 인증 미들웨어 (API 미연결 시 주석 처리) ---
// import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // API/Supabase 미연결: 인증 없이 모든 페이지 접근 허용
  return NextResponse.next({ request });

  // --- API 연동 시 아래 코드 복원 ---
  // let supabaseResponse = NextResponse.next({ request });
  //
  // const supabase = createServerClient(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  //   {
  //     cookies: {
  //       getAll() { return request.cookies.getAll(); },
  //       setAll(cookiesToSet) {
  //         cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
  //         supabaseResponse = NextResponse.next({ request });
  //         cookiesToSet.forEach(({ name, value, options }) =>
  //           supabaseResponse.cookies.set(name, value, options)
  //         );
  //       },
  //     },
  //   }
  // );
  //
  // const { data: { user } } = await supabase.auth.getUser();
  // const protectedPaths = ["/dashboard", "/groups", "/places"];
  // const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));
  //
  // if (isProtected && !user) {
  //   const url = request.nextUrl.clone();
  //   url.pathname = "/";
  //   return NextResponse.redirect(url);
  // }
  //
  // if (user && request.nextUrl.pathname === "/") {
  //   const url = request.nextUrl.clone();
  //   url.pathname = "/dashboard";
  //   return NextResponse.redirect(url);
  // }
  //
  // return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
