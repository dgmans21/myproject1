-- 약속 확정 브리핑: 당일 댓글 · 출발 상태
-- 007~008 적용 후 실행

CREATE TYPE departure_status AS ENUM ('NOT_DEPARTED', 'EN_ROUTE');

CREATE TABLE IF NOT EXISTS appointment_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_comments_apt
  ON appointment_comments (appointment_id, created_at);

CREATE TABLE IF NOT EXISTS appointment_member_departure (
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status departure_status NOT NULL DEFAULT 'NOT_DEPARTED',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (appointment_id, user_id)
);

ALTER TABLE appointment_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_member_departure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members view appointment comments"
  ON appointment_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN room_members rm ON rm.room_id = a.room_id
      WHERE a.id = appointment_comments.appointment_id
        AND rm.user_id = auth.uid()
    )
  );

CREATE POLICY "Room members post appointment comments"
  ON appointment_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM appointments a
      JOIN room_members rm ON rm.room_id = a.room_id
      WHERE a.id = appointment_comments.appointment_id
        AND rm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members view departure status"
  ON appointment_member_departure FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN room_members rm ON rm.room_id = a.room_id
      WHERE a.id = appointment_member_departure.appointment_id
        AND rm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members update own departure status"
  ON appointment_member_departure FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
