"use client";

import { useState } from "react";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Room } from "@/lib/api";
import { canDeleteRoom, canManageRoom } from "@/lib/permissions";

interface RoomActionMenuProps {
  room: Room;
  onPromote?: (roomId: string) => void;
  onDelete?: (roomId: string) => Promise<void>;
}

/** 방 카드·상세 ⋮ 메뉴 (방장 전용 삭제 등) */
export function RoomActionMenu({ room, onPromote, onDelete }: RoomActionMenuProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = Boolean(room.is_me_owner);
  const canDelete = canDeleteRoom(isOwner, room.room_type);
  const canPromote = canManageRoom(isOwner) && room.room_type === "ONE_TIME";

  if (!isOwner) return null;

  const items = [
    canPromote && onPromote
      ? {
          id: "promote",
          label: "고정방으로 승격",
          onClick: () => onPromote(room.id),
        }
      : null,
    canDelete && onDelete
      ? {
          id: "delete",
          label: "방 삭제",
          destructive: true,
          onClick: () => setConfirmDelete(true),
        }
      : null,
  ].filter(Boolean) as Parameters<typeof DropdownMenu>[0]["items"];

  if (items.length === 0) return null;

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(room.id);
      setConfirmDelete(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu items={items} ariaLabel="방 관리 메뉴" />
      <ConfirmDialog
        open={confirmDelete}
        title="정말 이 방을 삭제하시겠습니까?"
        description={"삭제 후 복구할 수 없습니다."}
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
