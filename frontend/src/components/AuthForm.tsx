"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useRouter } from "next/navigation";

const AGE_OPTIONS = [
  { value: "TEENS", label: "10대" },
  { value: "TWENTIES", label: "20대" },
  { value: "THIRTIES", label: "30대" },
  { value: "FORTIES", label: "40대" },
  { value: "FIFTIES_PLUS", label: "50대+" },
];

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [ageGroup, setAgeGroup] = useState("TWENTIES");
  const [residence, setResidence] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await new Promise((r) => setTimeout(r, 500));
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
        {isLogin ? "로그인" : "회원가입"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {isLogin
          ? "우리지금만나에 오신 것을 환영합니다"
          : "실명 없이 닉네임·나이대·거주지만 입력하세요"}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {!isLogin && (
          <>
            <Input
              label="닉네임"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="별명"
              required
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
                {AGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
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
