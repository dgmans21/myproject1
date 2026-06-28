-- 방 구분용 accent 색상 (마이페이지·목록 표시용, nullable)
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS accent_color TEXT;

ALTER TABLE rooms
  DROP CONSTRAINT IF EXISTS rooms_accent_color_hex_check;

ALTER TABLE rooms
  ADD CONSTRAINT rooms_accent_color_hex_check
  CHECK (
    accent_color IS NULL
    OR accent_color ~ '^#[0-9A-Fa-f]{6}$'
  );

COMMENT ON COLUMN rooms.accent_color IS '방 목록·상세 구분 색 (#RRGGBB). NULL이면 기본 테마 색 사용';
