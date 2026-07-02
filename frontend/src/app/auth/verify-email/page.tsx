"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "등록하신 이메일";

  return (
    <AuthShell title="이메일 인증" description="한 단계만 더 하면 가입이 완료됩니다.">
      <div className="rounded-2xl bg-surface px-4 py-6 text-center">
        <MailCheck className="mx-auto h-10 w-10 text-accent" />
        <p className="mt-3 text-sm text-foreground">
          <strong>{email}</strong>로 인증 메일을 보냈습니다.
        </p>
        <p className="mt-2 text-sm text-muted">
          메일의 링크를 눌러 인증을 완료한 뒤 로그인해 주세요. Supabase Dashboard에서
          Confirm email을 켜면 실제 발송됩니다.
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <Link href="/">
          <Button className="w-full" size="lg">
            로그인 화면으로
          </Button>
        </Link>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => alert("Supabase 연동 후 resendSignUpEmail 또는 OTP 재발송")}
        >
          인증 메일 다시 보내기
        </Button>
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Suspense fallback={<div className="text-muted">불러오는 중…</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
