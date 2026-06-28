"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { FriendInviteModal } from "@/components/FriendInviteModal";
import { useRoomStore } from "@/stores/room-store";
import { api, FriendSummary, RoomCreate } from "@/lib/api";
import { cn } from "@/lib/utils";
import { DEFAULT_ROOM_ACCENT, ROOM_ACCENT_PRESETS } from "@/lib/room-accent";
import { Crown, UserPlus, X, Zap } from "lucide-react";

interface RoomCreateFormProps {
  onClose: () => void;
}

function defaultExpireDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export function RoomCreateForm({ onClose }: RoomCreateFormProps) {
  const addRoom = useRoomStore((s) => s.addRoom);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [roomType, setRoomType] = useState<"ONE_TIME" | "REGULAR">("ONE_TIME");
  const [expireDate, setExpireDate] = useState(defaultExpireDate);
  const [accentColor, setAccentColor] = useState<string>(DEFAULT_ROOM_ACCENT);
  const [useJoinPassword, setUseJoinPassword] = useState(false);
  const [joinPassword, setJoinPassword] = useState("");
  const [inviteIds, setInviteIds] = useState<string[]>([]);
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [friendModalOpen, setFriendModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.friends.list().then(setFriends).catch(() => {});
  }, []);

  const invitedFriends = friends.filter((f) => inviteIds.includes(f.user_id));

  const removeInvite = (userId: string) => {
    setInviteIds((prev) => prev.filter((id) => id !== userId));
  };

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const payload: RoomCreate = {
        name: name.trim(),
        description: description || undefined,
        purpose: purpose || undefined,
        room_type: roomType,
        expire_date: roomType === "ONE_TIME" ? expireDate : undefined,
        accent_color: accentColor,
        join_password: useJoinPassword && joinPassword.trim() ? joinPassword.trim() : undefined,
      };
      const room = await api.rooms.create(payload);
      if (inviteIds.length > 0) {
        const result = await api.rooms.inviteMembers(room.id, inviteIds);
        if (result.failed.length > 0) {
          alert(
            `방이 만들어졌습니다. ${result.invited_count}명에게 초대를 보냈습니다.\n` +
              result.failed.map((f) => `${f.display_name}: ${f.message}`).join("\n")
          );
        }
      }
      addRoom(room);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "방 생성 실패");
    } finally {
      setCreating(false);
    }
  }, [
    name,
    description,
    purpose,
    roomType,
    expireDate,
    accentColor,
    useJoinPassword,
    joinPassword,
    inviteIds,
    addRoom,
    onClose,
  ]);

  return (
    <>
      <Card className="ring-2 ring-primary/20">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>방 만들기</CardTitle>
            <CardDescription className="mt-1">
              만들면서 친구를 함께 초대할 수 있습니다.
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-foreground"
            aria-label="방 만들기 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <Input
            id="room-create-name"
            label="방 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이번 주말 모임"
          />
          <Input label="목적" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="저녁 회식, 스터디 등" />
          <Textarea label="설명 (선택)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">방 유형</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRoomType("ONE_TIME")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                  roomType === "ONE_TIME"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted hover:border-primary/40"
                )}
              >
                <Zap className="h-4 w-4" /> 임시방
              </button>
              <button
                type="button"
                onClick={() => setRoomType("REGULAR")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                  roomType === "REGULAR"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted hover:border-primary/40"
                )}
              >
                <Crown className="h-4 w-4" /> 고정방
              </button>
            </div>
          </div>

          {roomType === "ONE_TIME" ? (
            <Input
              label="터트릴 날짜"
              type="date"
              value={expireDate}
              onChange={(e) => setExpireDate(e.target.value)}
            />
          ) : (
            <p className="text-xs text-muted">고정방은 만료일이 없습니다. 3개월 미활동 시 정리됩니다.</p>
          )}

          {roomType === "ONE_TIME" && (
            <p className="text-xs text-muted">임시방은 만료일이 지나면 자동 삭제됩니다.</p>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">방 색상</p>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
              {ROOM_ACCENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.label}
                  aria-label={preset.label}
                  aria-pressed={accentColor === preset.value}
                  onClick={() => setAccentColor(preset.value)}
                  className={cn(
                    "mx-auto h-8 w-8 rounded-full border-2 transition-transform",
                    accentColor === preset.value
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: preset.value }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-surface/50 p-4">
            <p className="text-sm font-medium text-foreground">친구 초대 (선택)</p>
            {friends.length === 0 ? (
              <p className="text-xs text-muted">초대할 친구가 없습니다.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setFriendModalOpen(true)}
                    disabled={creating}
                  >
                    <UserPlus className="h-3.5 w-3.5" /> 친구 선택
                  </Button>
                  {inviteIds.length > 0 && (
                    <span className="text-xs text-muted">{inviteIds.length}명 선택됨</span>
                  )}
                </div>
                {invitedFriends.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {invitedFriends.map((f) => (
                      <span
                        key={f.user_id}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground"
                      >
                        {f.display_name}
                        <button
                          type="button"
                          onClick={() => removeInvite(f.user_id)}
                          className="text-muted hover:text-foreground"
                          aria-label={`${f.display_name} 초대 취소`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={useJoinPassword}
                onChange={(e) => setUseJoinPassword(e.target.checked)}
                className="rounded border-border"
              />
              입장 비밀번호 사용 (선택)
            </label>
            {useJoinPassword && (
              <Input
                label="입장 비밀번호"
                type="password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                placeholder="방장만 알고 공유"
              />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCreate} disabled={creating || !name.trim()} variant="accent">
              {roomType === "ONE_TIME" ? "임시방 만들기" : "고정방 만들기"}
              {inviteIds.length > 0 ? ` · ${inviteIds.length}명 초대` : ""}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={creating}>
              취소
            </Button>
          </div>
        </div>
      </Card>

      <FriendInviteModal
        open={friendModalOpen}
        friends={friends}
        inviting={creating}
        onClose={() => setFriendModalOpen(false)}
        onInvite={(ids) => {
          setInviteIds(ids);
          setFriendModalOpen(false);
        }}
      />
    </>
  );
}
