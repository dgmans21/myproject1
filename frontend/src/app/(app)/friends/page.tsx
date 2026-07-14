"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FriendAddModal } from "@/components/FriendAddModal";
import { api, FriendSummary } from "@/lib/api";
import { useAuthSession } from "@/lib/use-auth-session";
import { Lock, LogIn, UserPlus, Users } from "lucide-react";

function FriendsGuestGate({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16">
      <Card className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="h-7 w-7" />
        </div>
        <CardTitle className="mt-6 text-lg">로그인 후 이용 가능합니다</CardTitle>
        <CardDescription className="mt-3 leading-relaxed">
          친구 목록은 회원만 관리할 수 있어요. 로그인 후 방 초대에 쓸 친구를 등록해 보세요.
        </CardDescription>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-border"
          >
            대시보드로
          </Link>
          <Button onClick={onLogin}>
            <LogIn className="h-4 w-4" /> 로그인 · 가입하기
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function FriendsPage() {
  const { needsLogin, login } = useAuthSession();
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const loadFriends = useCallback(() => {
    return api.friends
      .list()
      .then(setFriends)
      .catch(() => setFriends([]));
  }, []);

  useEffect(() => {
    if (needsLogin) {
      setLoading(false);
      return;
    }
    loadFriends().finally(() => setLoading(false));
  }, [needsLogin, loadFriends]);

  if (needsLogin) {
    return <FriendsGuestGate onLogin={login} />;
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            방 만들기·초대할 때 선택하는 친구 목록입니다
          </p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <UserPlus className="h-4 w-4" /> 친구 추가
        </Button>
      </div>

      <Card className="mt-6">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">내 친구 {friends.length}명</CardTitle>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-muted">불러오는 중...</p>
        ) : friends.length === 0 ? (
          <div className="mt-4 text-center">
            <CardDescription className="leading-relaxed">
              아직 등록된 친구가 없습니다.
              <br />
              닉네임으로 검색해 친구를 추가해 보세요.
            </CardDescription>
            <Button className="mt-4" size="sm" onClick={() => setModalOpen(true)}>
              <UserPlus className="h-4 w-4" /> 첫 친구 추가하기
            </Button>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {friends.map((friend) => (
              <li
                key={friend.user_id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 px-3 py-2.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {friend.display_name.slice(0, 1)}
                </span>
                <span className="text-sm font-medium text-foreground">{friend.display_name}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <FriendAddModal
        open={modalOpen}
        existingFriendIds={friends.map((f) => f.user_id)}
        onClose={() => setModalOpen(false)}
        onAdded={(friend) => {
          setFriends((prev) => {
            if (prev.some((f) => f.user_id === friend.user_id)) return prev;
            return [...prev, friend].sort((a, b) =>
              a.display_name.localeCompare(b.display_name, "ko")
            );
          });
        }}
      />
    </div>
  );
}
