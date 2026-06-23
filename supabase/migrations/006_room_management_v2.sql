-- 방 관리 v2: is_fixed, expire_at, 방 잔디, pg_cron 만료·미사용 삭제
-- 001~005 적용 후 SQL Editor에서 실행하세요.
-- pg_cron: Supabase Dashboard → Database → Extensions → pg_cron 활성화

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expire_at TIMESTAMPTZ;

UPDATE rooms
SET is_fixed = (room_type = 'REGULAR')
WHERE is_fixed IS DISTINCT FROM (room_type = 'REGULAR');

-- 레거시 임시방: 만료일 없으면 생성일+30일
UPDATE rooms
SET expire_at = (created_at + INTERVAL '30 days')
WHERE NOT is_fixed AND expire_at IS NULL;

ALTER TABLE rooms
  ADD CONSTRAINT rooms_fixed_expire_check CHECK (
    (is_fixed = true AND expire_at IS NULL)
    OR (is_fixed = false AND expire_at IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_rooms_expire_at ON rooms (expire_at)
  WHERE expire_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rooms_last_activity_fixed ON rooms (last_activity_at)
  WHERE is_fixed = true;

-- 방별 활동 잔디 (GitHub 스타일)
CREATE TABLE IF NOT EXISTS room_activity_days (
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  activity_on DATE NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 1 CHECK (event_count > 0),
  PRIMARY KEY (room_id, activity_on)
);

CREATE OR REPLACE FUNCTION log_room_activity_day(p_room_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO room_activity_days (room_id, activity_on, event_count)
  VALUES (p_room_id, CURRENT_DATE, 1)
  ON CONFLICT (room_id, activity_on)
  DO UPDATE SET event_count = room_activity_days.event_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION touch_room_activity()
RETURNS TRIGGER AS $$
DECLARE
  target_room_id UUID;
BEGIN
  target_room_id := COALESCE(NEW.room_id, OLD.room_id);
  UPDATE rooms SET last_activity_at = NOW(), updated_at = NOW()
  WHERE id = target_room_id;
  PERFORM log_room_activity_day(target_room_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- expire_at 지난 임시방 삭제 (pg_cron 1분 주기)
CREATE OR REPLACE FUNCTION delete_expired_rooms()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH doomed AS (
    DELETE FROM rooms
    WHERE NOT is_fixed
      AND expire_at IS NOT NULL
      AND expire_at <= NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM doomed;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 고정방: 3개월 미활동 시 삭제 (일 1회 cron 권장)
CREATE OR REPLACE FUNCTION delete_inactive_fixed_rooms()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH doomed AS (
    DELETE FROM rooms
    WHERE is_fixed = true
      AND last_activity_at < NOW() - INTERVAL '3 months'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM doomed;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 레거시 archive 함수는 v2 정책(삭제)으로 대체 — 호출부 호환용 no-op
CREATE OR REPLACE FUNCTION archive_inactive_one_time_rooms()
RETURNS void AS $$
BEGIN
  PERFORM delete_expired_rooms();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION purge_archived_one_time_rooms()
RETURNS void AS $$
BEGIN
  PERFORM delete_inactive_fixed_rooms();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE room_activity_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can view room activity"
  ON room_activity_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = room_activity_days.room_id
        AND user_id = auth.uid()
    )
  );

-- pg_cron 등록 (Supabase Dashboard → Database → Extensions → pg_cron ON 후 실행)
-- SELECT cron.schedule('delete-expired-rooms-job', '* * * * *', $$SELECT public.delete_expired_rooms();$$);
-- SELECT cron.schedule('delete-inactive-fixed-rooms-job', '0 3 * * *', $$SELECT public.delete_inactive_fixed_rooms();$$);
