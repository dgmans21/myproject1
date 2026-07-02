"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호 확인이 일치하지 않습니다");
      return;
    }

    setLoading(true);
    try {
      // TODO: supabase.auth.updateUser({ password }) — 이메일 링크 콜백 세션 필요
      await new Promise((r) => setTimeout(r, 500));
      router.push("/?reset=ok");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <AuthShell
        title="새 비밀번호 설정"
        description="메일 링크를 통해 들어오신 경우에만 변경할 수 있습니다."
        backHref="/"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="새 비밀번호"
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자 이상"
            minLength={6}
            required
            autoComplete="new-password"
          />
          <Input
            label="새 비밀번호 확인"
            id="new-password-confirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="다시 입력"
            minLength={6}
            required
            autoComplete="new-password"
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "저장 중…" : "비밀번호 변경"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/auth/forgot-password" className="text-primary hover:underline">
            링크가 만료됐나요? 다시 요청하기
          </Link>
        </p>
      </AuthShell>
    </div>
  );
}
