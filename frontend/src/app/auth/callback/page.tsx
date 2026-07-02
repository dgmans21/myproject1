"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";

function CallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const error = searchParams.get("error_description") ?? searchParams.get("error");

  useEffect(() => {
    // TODO: supabase.auth.exchangeCodeForSession (PKCE) 또는 hash fragment 처리
    const timer = setTimeout(() => {
      if (error) {
        setStatus("error");
        return;
      }
      window.location.href = "/dashboard";
    }, 800);
    return () => clearTimeout(timer);
  }, [error]);

  if (status === "error" || error) {
    return (
      <AuthShell title="로그인 실패" description="소셜 로그인 중 문제가 발생했습니다.">
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {error ?? "알 수 없는 오류"}
        </p>
        <Link href="/" className="mt-4 block">
          <Button variant="secondary" className="w-full">
            다시 시도
          </Button>
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="로그인 처리 중" description="잠시만 기다려 주세요.">
      <div className="flex flex-col items-center py-8 text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm">Supabase OAuth 콜백 (연동 후 실제 세션 생성)</p>
      </div>
    </AuthShell>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Suspense fallback={<div className="text-muted">불러오는 중…</div>}>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
