"use client";

import { useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { toAuthErrorMessage } from "@/lib/auth-error-messages";

/** 로그인 상태에서 Auth 비밀번호 변경 (메일 재설정과 별개) */
export function ProfilePasswordPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDone(false);

    if (password.length < 6) {
      setError("새 비밀번호는 6자 이상이어야 합니다");
      return;
    }
    if (password !== passwordConfirm) {
      setError("새 비밀번호 확인이 일치하지 않습니다");
      return;
    }
    if (password === currentPassword) {
      setError("새 비밀번호는 현재 비밀번호와 달라야 합니다");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user?.email) {
        setError("이메일 계정이 없습니다. 소셜 로그인만 사용 중이면 비밀번호를 설정할 수 없습니다.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) throw signInError;

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setCurrentPassword("");
      setPassword("");
      setPasswordConfirm("");
      setDone(true);
    } catch (err: unknown) {
      setError(toAuthErrorMessage(err, "reset-password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardTitle className="text-base">비밀번호 변경</CardTitle>
      <CardDescription className="mt-1">
        이메일·비밀번호로 가입한 계정만 변경할 수 있습니다. 소셜만 쓰는 경우 로그인 화면의
        「비밀번호를 잊으셨나요?」로 설정할 수 있습니다.
      </CardDescription>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <Input
          label="현재 비밀번호"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <Input
          label="새 비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="6자 이상"
          minLength={6}
          autoComplete="new-password"
          required
        />
        <Input
          label="새 비밀번호 확인"
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          minLength={6}
          autoComplete="new-password"
          required
        />
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        {done && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            비밀번호가 변경되었습니다.
          </p>
        )}
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "변경 중…" : "비밀번호 변경"}
        </Button>
      </form>
    </Card>
  );
}
