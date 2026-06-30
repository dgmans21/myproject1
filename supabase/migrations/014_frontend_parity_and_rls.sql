-- 013 적용 후 실행
-- 프론트(mock api.ts) 기능 parity + RLS 보완 + trust 트리거 수정
-- 백엔드 라우트 추가는 별도 작업 (스키마만으로 E2E 불가)

-- ============================================================
-- 1. room_type: TEAM_SCHEDULE (팀 일정방 = 고정방)
-- ============================================================
ALTER TYPE room_type ADD VALUE IF NOT EXISTS 'TEAM_SCHEDULE';

COMMENT ON TYPE room_type IS 'ONE_TIME=임시, REGULAR=고정 모임, TEAM_SCHEDULE=팀 일정 공유';

-- ============================================================
-- 2. 모임 주목적 (일반 모임방)
-- ============================================================
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS meeting_purpose TEXT,
  ADD COLUMN IF NOT EXISTS meeting_purpose_custom TEXT;

ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_meeting_purpose_check;
ALTER TABLE rooms
  ADD CONSTRAINT rooms_meeting_purpose_check
  CHECK (
    meeting_purpose IS NULL
    OR meeting_purpose IN ('MAJOR_PRESENTATION', 'MONTHLY', 'CASUAL', 'FLASH', 'OTHER')
  );

ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_meeting_purpose_other_check;
ALTER TABLE rooms
  ADD CONSTRAINT rooms_meeting_purpose_other_check
  CHECK (
    meeting_purpose IS DISTINCT FROM 'OTHER'
    OR meeting_purpose_custom IS NULL
    OR char_length(trim(meeting_purpose_custom)) >= 1
  );

COMMENT ON COLUMN rooms.meeting_purpose IS '모임 주목적 enum ID (프론트 meeting-purpose.ts)';
COMMENT ON COLUMN rooms.purpose IS '방 설명용 자유 텍스트 (meeting_purpose와 별개)';

-- ============================================================
-- 3. 초대 링크 · 입장 비밀번호 · 방장 인도
-- ============================================================
CREATE TABLE IF NOT EXISTS room_invite_links (
  room_id UUID PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_invite_links_token ON room_invite_links (token);

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS join_password_hash TEXT;

COMMENT ON COLUMN rooms.join_password_hash IS '입장 비밀번호 SHA-256 (평문 저장 금지)';

CREATE TABLE IF NOT EXISTS room_host_transfer_pending (
  room_id UUID PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT room_host_transfer_no_self CHECK (from_user_id <> to_user_id)
);

-- ============================================================
-- 4. 팀 일정방: 월간 메모 · 주간 가능 시간 · 마일스톤
-- ============================================================
CREATE TABLE IF NOT EXISTS team_schedule_day_memos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  memo TEXT NOT NULL CHECK (char_length(trim(memo)) >= 1),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (room_id, user_id, schedule_date)
);

CREATE INDEX IF NOT EXISTS idx_team_schedule_day_memos_room_month
  ON team_schedule_day_memos (room_id, schedule_date);

CREATE TABLE IF NOT EXISTS team_schedule_week_availability (
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  slot_key TEXT NOT NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (room_id, user_id, week_start, slot_key),
  CONSTRAINT team_schedule_slot_key_format CHECK (slot_key ~ '^\d{4}-\d{2}-\d{2}\|\d{1,2}$')
);

CREATE TABLE IF NOT EXISTS team_schedule_week_notes (
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  other_times TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id, week_start)
);

CREATE TABLE IF NOT EXISTS team_schedule_milestones (
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  label TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (room_id, item_id)
);

CREATE OR REPLACE FUNCTION seed_team_schedule_milestones(p_room_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO team_schedule_milestones (room_id, item_id, label, sort_order) VALUES
    (p_room_id, 'meeting', '회의', 1),
    (p_room_id, 'design', '디자인', 2),
    (p_room_id, 'qa', 'QA', 3),
    (p_room_id, 'deploy', '배포', 4)
  ON CONFLICT (room_id, item_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION on_room_created_after()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.room_type = 'TEAM_SCHEDULE' THEN
    PERFORM seed_team_schedule_milestones(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS rooms_after_insert_team_schedule ON rooms;
CREATE TRIGGER rooms_after_insert_team_schedule
  AFTER INSERT ON rooms
  FOR EACH ROW EXECUTE FUNCTION on_room_created_after();

-- ============================================================
-- 5. 친구 목록 (초대 후보)
-- ============================================================
CREATE TABLE IF NOT EXISTS friendships (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id),
  CONSTRAINT friendships_no_self CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships (user_id);

-- ============================================================
-- 6. profile_decor — interest_emojis 배열 한도
-- ============================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_profile_decor_interest_emojis_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_profile_decor_interest_emojis_check
  CHECK (
    profile_decor->'interest_emojis' IS NULL
    OR (
      jsonb_typeof(profile_decor->'interest_emojis') = 'array'
      AND jsonb_array_length(profile_decor->'interest_emojis') <= 24
    )
  );

-- ============================================================
-- 7. 신뢰도 트리거 — UPDATE/DELETE 시 이전 표 되돌리기
-- ============================================================
CREATE OR REPLACE FUNCTION sync_profile_trust()
RETURNS TRIGGER AS $$
DECLARE
  recommender UUID;
  place_id_val UUID;
  voter_id_val UUID;
  old_delta INTEGER := 0;
  new_delta INTEGER := 0;
  next_score INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    place_id_val := OLD.place_id;
    voter_id_val := OLD.voter_id;
    old_delta := CASE OLD.vote_type WHEN 'RECOMMEND' THEN -1 ELSE 1 END;
  ELSE
    place_id_val := NEW.place_id;
    voter_id_val := NEW.voter_id;
    IF TG_OP = 'UPDATE' AND OLD.vote_type IS NOT DISTINCT FROM NEW.vote_type THEN
      RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' THEN
      old_delta := CASE OLD.vote_type WHEN 'RECOMMEND' THEN -1 ELSE 1 END;
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      new_delta := CASE NEW.vote_type WHEN 'RECOMMEND' THEN 1 ELSE -1 END;
    END IF;
  END IF;

  SELECT recommended_by INTO recommender FROM places WHERE id = place_id_val;
  IF recommender IS NULL OR recommender = voter_id_val THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  next_score := GREATEST(0, (SELECT trust_score FROM profiles WHERE id = recommender) + old_delta + new_delta);

  UPDATE profiles
  SET
    trust_score = next_score,
    badge_tier = calc_badge_tier(next_score),
    updated_at = NOW()
  WHERE id = recommender;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS place_recommendation_vote_trust ON place_recommendation_votes;
CREATE TRIGGER place_recommendation_vote_trust
  AFTER INSERT OR UPDATE OF vote_type OR DELETE ON place_recommendation_votes
  FOR EACH ROW EXECUTE FUNCTION sync_profile_trust();

-- ============================================================
-- 8. 공개 프로필 뷰 (security_pin_hash 등 민감 컬럼 제외)
-- ============================================================
CREATE OR REPLACE VIEW profiles_public AS
SELECT
  id,
  display_name,
  age_group,
  residence,
  trust_score,
  badge_tier,
  selected_title_id,
  selected_social_title_id,
  social_points,
  mbti_types,
  profile_decor,
  places_adopted_count,
  role,
  created_at,
  updated_at
FROM profiles;

COMMENT ON VIEW profiles_public IS
  '랭킹·멤버 목록용 공개 프로필. security_pin_hash·home_address·home_lat/lng 제외';

-- ============================================================
-- 9. RLS 정책 보완
--    (백엔드 service role은 bypass — Supabase 클라이언트·Realtime 대비)
-- ============================================================

-- profiles: 본인만 전체 행 UPDATE, SELECT는 공개(민감 컬럼은 뷰 사용 권장)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Profiles selectable by authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- room_members
CREATE POLICY "Members can join rooms"
  ON room_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update member roles"
  ON room_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_members rm
      WHERE rm.room_id = room_members.room_id
        AND rm.user_id = auth.uid()
        AND rm.role = 'OWNER'
    )
  );

CREATE POLICY "Owners can remove members"
  ON room_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM room_members rm
      WHERE rm.room_id = room_members.room_id
        AND rm.user_id = auth.uid()
        AND rm.role = 'OWNER'
    )
  );

-- room_invitations
CREATE POLICY "Invitee can view own invitations"
  ON room_invitations FOR SELECT
  TO authenticated
  USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

CREATE POLICY "Room owners can create invitations"
  ON room_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = room_invitations.room_id
        AND user_id = auth.uid()
        AND role = 'OWNER'
    )
  );

CREATE POLICY "Invitee can respond to invitations"
  ON room_invitations FOR UPDATE
  TO authenticated
  USING (invitee_id = auth.uid());

-- appointments
CREATE POLICY "Room members view appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = appointments.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Room members create appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = appointments.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Room members update appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = appointments.room_id AND user_id = auth.uid()
    )
  );

-- date_votes / time_votes
CREATE POLICY "Members manage own date votes"
  ON date_votes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM appointments a
      JOIN room_members rm ON rm.room_id = a.room_id
      WHERE a.id = date_votes.appointment_id AND rm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members view date votes in room"
  ON date_votes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN room_members rm ON rm.room_id = a.room_id
      WHERE a.id = date_votes.appointment_id AND rm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members manage own time votes"
  ON time_votes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM appointments a
      JOIN room_members rm ON rm.room_id = a.room_id
      WHERE a.id = time_votes.appointment_id AND rm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members view time votes in room"
  ON time_votes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN room_members rm ON rm.room_id = a.room_id
      WHERE a.id = time_votes.appointment_id AND rm.user_id = auth.uid()
    )
  );

-- places / ratings / recommendation votes
CREATE POLICY "Authenticated users view places"
  ON places FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users create places"
  ON places FOR INSERT
  TO authenticated
  WITH CHECK (recommended_by = auth.uid());

CREATE POLICY "Users manage own place ratings"
  ON place_ratings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone view place ratings"
  ON place_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users manage own recommendation votes"
  ON place_recommendation_votes FOR ALL
  TO authenticated
  USING (voter_id = auth.uid())
  WITH CHECK (voter_id = auth.uid());

CREATE POLICY "Anyone view recommendation votes"
  ON place_recommendation_votes FOR SELECT
  TO authenticated
  USING (true);

-- appointment_attendance / travel logs
CREATE POLICY "Members view attendance"
  ON appointment_attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN room_members rm ON rm.room_id = a.room_id
      WHERE a.id = appointment_attendance.appointment_id AND rm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users manage own attendance"
  ON appointment_attendance FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own travel logs"
  ON user_travel_logs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- appointment comments delete
CREATE POLICY "Authors delete own comments"
  ON appointment_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- new tables RLS
ALTER TABLE room_invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_host_transfer_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_schedule_day_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_schedule_week_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_schedule_week_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_schedule_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members view invite links"
  ON room_invite_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = room_invite_links.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Room owners manage invite links"
  ON room_invite_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = room_invite_links.room_id
        AND user_id = auth.uid()
        AND role = 'OWNER'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = room_invite_links.room_id
        AND user_id = auth.uid()
        AND role = 'OWNER'
    )
  );

CREATE POLICY "Members view host transfer pending"
  ON room_host_transfer_pending FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = room_host_transfer_pending.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Owner requests host transfer"
  ON room_host_transfer_pending FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = room_host_transfer_pending.room_id
        AND user_id = auth.uid()
        AND role = 'OWNER'
    )
  );

CREATE POLICY "Owner or target deletes host transfer"
  ON room_host_transfer_pending FOR DELETE
  TO authenticated
  USING (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  );

CREATE POLICY "Team schedule memos for members"
  ON team_schedule_day_memos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = team_schedule_day_memos.room_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = team_schedule_day_memos.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team schedule week slots for members"
  ON team_schedule_week_availability FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = team_schedule_week_availability.room_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = team_schedule_week_availability.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team schedule week notes for members"
  ON team_schedule_week_notes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = team_schedule_week_notes.room_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = team_schedule_week_notes.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team schedule milestones for members"
  ON team_schedule_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = team_schedule_milestones.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team schedule milestones update for members"
  ON team_schedule_milestones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = team_schedule_milestones.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Friends view own graph"
  ON friendships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
