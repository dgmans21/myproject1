"use client";

import { useState } from "react";
// import { createClient } from "@/lib/supabase/client"; // API 연동 시 복원
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useRouter } from "next/navigation";

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // API/Supabase 미연결: 로그인 없이 대시보드로 이동 (UI 미리보기)
    try {
      await new Promise((r) => setTimeout(r, 500));
      router.push("/dashboard");

      // --- API 연동 시 아래 코드 복원 ---
      // const supabase = createClient();
      // if (isLogin) {
      //   const { error } = await supabase.auth.signInWithPassword({ email, password });
      //   if (error) throw error;
      // } else {
      //   const { error } = await supabase.auth.signUp({
      //     email, password,
      //     options: { data: { display_name: displayName } },
      //   });
      //   if (error) throw error;
      // }
      // router.push("/dashboard");
      // router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <h2 className="text-xl font-bold text-foreground">
        {isLogin ? "로그인" : "회원가입"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {isLogin ? "MeetSync에 오신 것을 환영합니다" : "새 계정을 만들어 시작하세요"}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {!isLogin && (
          <Input
            label="닉네임"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="홍길동"
            required
          />
        )}
        <Input
          label="이메일"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <Input
          label="비밀번호"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="6자 이상"
          minLength={6}
          required
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "처리 중..." : isLogin ? "로그인" : "가입하기"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        {isLogin ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}{" "}
        <button
          type="button"
          onClick={() => { setIsLogin(!isLogin); setError(""); }}
          className="font-medium text-primary hover:underline"
        >
          {isLogin ? "회원가입" : "로그인"}
        </button>
      </p>
    </Card>
  );
}
