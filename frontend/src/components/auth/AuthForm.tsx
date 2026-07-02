"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { AuthSocialButtons } from "@/components/auth/AuthSocialButtons";
import { AUTH_AGE_OPTIONS } from "@/lib/auth-ui-constants";
import { clearGuestSession, setSessionMode } from "@/lib/auth-session";

type AuthMode = "login" | "signup";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [ageGroup, setAgeGroup] = useState<string>("TWENTIES");
  const [residence, setResidence] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError("");
    setPasswordConfirm("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup" && password !== passwordConfirm) {
      setError("비밀번호 확인이 일치하지 않습니다");
      return;
    }

    setLoading(true);
    try {
      clearGuestSession();
      // TODO: Supabase signInWithPassword / signUp + emailRedirectTo
      await new Promise((r) => setTimeout(r, 500));

      if (mode === "signup") {
        const params = new URLSearchParams({ email: email.trim() });
        router.push(`/auth/verify-email?${params.toString()}`);
        return;
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <h2 className="text-xl font-bold text-foreground">
        {mode === "login" ? "로그인" : "회원가입"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {mode === "login"
          ? "이메일 또는 소셜 계정으로 로그인하세요"
          : "실명 없이 닉네임·나이대·거주지·이메일을 등록합니다"}
      </p>

      <div className="mt-6">
        <AuthSocialButtons disabled={loading} />
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-border" />
        </div>
        <p className="relative mx-auto w-fit bg-card px-3 text-xs text-muted">또는 이메일</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <>
            <Input
              label="닉네임"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="별명"
              required
              autoComplete="nickname"
            />
            <div>
              <label htmlFor="ageGroup" className="mb-1.5 block text-sm font-medium text-foreground">
                나이대
              </label>
              <select
                id="ageGroup"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
                required
              >
                {AUTH_AGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="거주지 (시/구)"
              id="residence"
              value={residence}
              onChange={(e) => setResidence(e.target.value)}
              placeholder="서울 강남구"
              required
              autoComplete="address-level2"
            />
          </>
        )}

        <Input
          label="이메일"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />

        <div>
          <Input
            label="비밀번호"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "8자 이상 권장" : "비밀번호"}
            minLength={6}
            required
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          {mode === "login" && (
            <div className="mt-2 text-right">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                비밀번호를 잊으셨나요?
              </Link>
            </div>
          )}
        </div>

        {mode === "signup" && (
          <Input
            label="비밀번호 확인"
            id="passwordConfirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="비밀번호 다시 입력"
            minLength={6}
            required
            autoComplete="new-password"
          />
        )}

        {mode === "signup" && (
          <p className="text-xs text-muted">
            가입 시 입력한 이메일로 <strong className="text-foreground">인증 메일</strong>이
            발송됩니다. (Supabase 연동 후 활성화)
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "처리 중…" : mode === "login" ? "로그인" : "가입하기"}
        </Button>
      </form>

      <div className="mt-4 border-t border-border pt-4">
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setSessionMode("guest");
            router.push("/groups");
          }}
        >
          로그인 없이 둘러보기 (비회원)
        </Button>
        <p className="mt-2 text-center text-xs text-muted">
          방·일정·리뷰 조회는 가능합니다. 작성·관리는 로그인 후 이용해 주세요.
        </p>
      </div>

      <p className="mt-4 text-center text-sm text-muted">
        {mode === "login" ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}{" "}
        <button
          type="button"
          onClick={() => switchMode(mode === "login" ? "signup" : "login")}
          className="font-medium text-primary hover:underline"
        >
          {mode === "login" ? "회원가입" : "로그인"}
        </button>
      </p>
    </Card>
  );
}
