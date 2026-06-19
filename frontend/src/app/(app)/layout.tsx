// --- Supabase 로그인 체크 (API 미연결 시 주석 처리) ---
// import { redirect } from "next/navigation";
// import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // API/Supabase 미연결: 로그인 없이 페이지 표시
  return <>{children}</>;

  // --- API 연동 시 아래 코드 복원 ---
  // const supabase = await createClient();
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) {
  //   redirect("/");
  // }
  // return <>{children}</>;
}
