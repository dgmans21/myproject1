"use client";

import { FriendSummary } from "@/lib/api";
import { MemberPickerModal } from "@/components/MemberPickerModal";

interface FriendInviteModalProps {
  open: boolean;
  friends: FriendSummary[];
  inviting?: boolean;
  onClose: () => void;
  onInvite: (userIds: string[]) => void;
}

/** 친구 초대용 — 다중 선택 MemberPickerModal */
export function FriendInviteModal({
  open,
  friends,
  inviting = false,
  onClose,
  onInvite,
}: FriendInviteModalProps) {
  return (
    <MemberPickerModal
      multiple
      open={open}
      title="초대할 친구"
      items={friends}
      confirmLabel="초대 보내기"
      emptyMessage="초대할 친구가 없습니다."
      footerHint={`친구 ${friends.length}명 · 여러 명 한 번에 초대 가능`}
      submitting={inviting}
      onClose={onClose}
      onConfirm={onInvite}
    />
  );
}
