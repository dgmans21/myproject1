"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ImagePlus, X } from "lucide-react";

const MAX_PHOTOS = 4;
const MAX_FILE_MB = 5;

export type MeetingPhotoDraft = {
  id: string;
  file: File;
  previewUrl: string;
};

type MeetingPhotoUploadProps = {
  appointmentId: string;
  disabled?: boolean;
  onChange?: (files: MeetingPhotoDraft[]) => void;
};

/**
 * 만남 추억록 사진 첨부 UI.
 * 스토리지(Supabase Storage 등) 연동 전까지 모달에서 import/렌더링은 주석 처리해 둡니다.
 */
export function MeetingPhotoUpload({
  appointmentId,
  disabled = false,
  onChange,
}: MeetingPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<MeetingPhotoDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  const revokeAll = useCallback((items: MeetingPhotoDraft[]) => {
    items.forEach((p) => URL.revokeObjectURL(p.previewUrl));
  }, []);

  const updatePhotos = useCallback(
    (next: MeetingPhotoDraft[]) => {
      setPhotos(next);
      onChange?.(next);
    },
    [onChange]
  );

  const handlePick = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setError(null);
    const incoming = Array.from(fileList);
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      setError(`사진은 최대 ${MAX_PHOTOS}장까지예요.`);
      return;
    }

    const accepted: MeetingPhotoDraft[] = [];
    for (const file of incoming.slice(0, room)) {
      if (!file.type.startsWith("image/")) {
        setError("이미지 파일만 올릴 수 있어요.");
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`한 장당 ${MAX_FILE_MB}MB 이하만 가능해요.`);
        continue;
      }
      accepted.push({
        id: `${appointmentId}-${file.name}-${file.lastModified}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (accepted.length) updatePhotos([...photos, ...accepted]);
  };

  const removePhoto = (id: string) => {
    const target = photos.find((p) => p.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    updatePhotos(photos.filter((p) => p.id !== id));
  };

  const clearAll = () => {
    revokeAll(photos);
    updatePhotos([]);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">사진 (선택)</p>
        {photos.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted hover:text-foreground"
          >
            전부 지우기
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => handlePick(e.target.files)}
      />

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled || photos.length >= MAX_PHOTOS}
        onClick={() => inputRef.current?.click()}
        className="gap-2"
      >
        <ImagePlus className="h-4 w-4" />
        사진 올리기
      </Button>

      {error && <p className="text-xs text-warm">{error}</p>}

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {photos.map((photo) => (
            <li key={photo.id} className="relative overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt=""
                className="aspect-square w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white"
                aria-label="사진 삭제"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">
        업로드·저장은 스토리지 연동 후 활성화됩니다. (최대 {MAX_PHOTOS}장 · {MAX_FILE_MB}MB)
      </p>
    </div>
  );
}

/**
 * 스토리지 연동 시 호출할 업로드 함수 (현재 미사용).
 * Supabase Storage bucket `meeting-memories` 등에 맞게 구현하면 됩니다.
 */
export async function uploadMeetingPhotos(
  _appointmentId: string,
  _photos: MeetingPhotoDraft[]
): Promise<string[]> {
  // const token = await getAccessToken();
  // const paths: string[] = [];
  // for (const photo of photos) {
  //   const path = `appointments/${appointmentId}/${photo.id}`;
  //   await fetch(`${API_URL}/storage/...`, { method: "POST", body: photo.file });
  //   paths.push(path);
  // }
  // return paths;
  throw new Error("사진 업로드는 아직 연결되지 않았습니다.");
}
