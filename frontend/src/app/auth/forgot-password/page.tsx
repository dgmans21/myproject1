"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthSocialButtons } from "@/components/auth/AuthSocialButtons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const presetEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(presetEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // TODO: supabase.auth.resetPasswordForEmail(email, { redirectTo })
      await new Promise((r) => setTimeout(r, 500));
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell
        title="메일을 확인해 주세요"
        description="등록된 이메일로 비밀번호 재설정 링크를 보냈습니다."
      >
        <div className="rounded-2xl bg-surface px-4 py-6 text-center">
          <Mail className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 text-sm text-foreground">
            <strong>{email}</strong>
          </p>
          <p className="mt-2 text-sm text-muted">
            메일이 보이지 않으면 스팸함을 확인하거나, 소셜 로그인(Google·카카오)으로
            가입하셨다면 해당 서비스로 다시 로그인해 주세요.
          </p>
        </div>
        <Link href="/" className="mt-4 block">
          <Button variant="secondary" className="w-full">
            로그인으로 돌아가기
          </Button>
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="비밀번호 찾기"
      description="가입 시 등록한 이메일로 재설정 링크를 보내 드립니다."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="이메일"
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "보내는 중…" : "재설정 링크 보내기"}
        </Button>
      </form>

      <div className="mt-6 border-t border-border pt-6">
        <p className="mb-3 text-center text-xs text-muted">소셜 계정으로 가입하셨나요?</p>
        <AuthSocialButtons disabled={loading} />
      </div>
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Suspense fallback={<div className="text-muted">불러오는 중…</div>}>
        <ForgotPasswordContent />
      </Suspense>
    </div>
  );
}
