-- 소셜 포인트(칭찬 스티커) · MBTI · room_votes
-- 006 적용 후 실행

CREATE TYPE praise_sticker AS ENUM (
  'PUNCTUAL',
  'MOOD_MAKER',
  'GOOD_LISTENER',
  'TEAM_PLAYER',
  'LIFE_OF_PARTY'
);

CREATE TYPE room_vote_kind AS ENUM ('PRAISE_STICKER', 'TRAVEL_REWARD');

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS social_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selected_social_title_id INTEGER,
  ADD COLUMN IF NOT EXISTS mbti_types TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE profiles
  ADD CONSTRAINT profiles_mbti_max_two
  CHECK (cardinality(mbti_types) <= 2);

CREATE TABLE social_point_titles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  min_points INTEGER NOT NULL UNIQUE,
  badge_color TEXT NOT NULL,
  border_style TEXT DEFAULT 'none'
);


INSERT INTO social_point_titles (id, title, name_en, min_points, badge_color, border_style) VALUES
  (1, '방구석 새내기', 'Homebody Rookie', 0, '#94A3B8', 'none'),
  (2, '약속 지킴이', 'Promise Keeper', 100, '#CD7F32', 'bronze'),
  (3, '분위기 메이커', 'Mood Maker', 200, '#C0C0C0', 'silver'),
  (4, '모임 요정', 'Meetup Fairy', 400, '#DAA520', 'gold_shiny'),
  (5, '인싸 새싹', 'Inssa Sprout', 800, '#E5E4E2', 'platinum_shiny'),
  (6, '방장 후보생', 'Leader Cadet', 1000, '#50C878', 'emerald_shiny'),
  (7, '분위기 마스터', 'Mood Master', 2000, '#B9F2FF', 'diamond_shiny'),
  (8, '핵인싸', 'Super Inssa', 3000, '#2563EB', 'master_blue'),
  (9, '보급형 유재석', 'Legendary MC', 5000, '#800020', 'grandmaster_crimson_vermilion'),
  (10, '모임 VIP', 'Meetup VIP', 10000, '#FDE047', 'vip_white_gold'),
  (11, '불멸의 인싸', 'Immortal Inssa', 15000, '#D4AF37', 'immortal_gold_red_aura');

ALTER TABLE profiles
  ADD CONSTRAINT profiles_selected_social_title_id_fkey
  FOREIGN KEY (selected_social_title_id) REFERENCES social_point_titles(id) ON DELETE SET NULL;

CREATE TABLE room_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_kind room_vote_kind NOT NULL,
  sticker praise_sticker,
  points_awarded INTEGER NOT NULL CHECK (points_awarded > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT room_votes_no_self CHECK (voter_id <> target_user_id),
  CONSTRAINT room_votes_sticker_required CHECK (
    (vote_kind = 'PRAISE_STICKER' AND sticker IS NOT NULL)
    OR (vote_kind = 'TRAVEL_REWARD' AND sticker IS NULL)
  )
);

CREATE UNIQUE INDEX room_votes_praise_once
  ON room_votes (room_id, appointment_id, voter_id, target_user_id)
  WHERE vote_kind = 'PRAISE_STICKER';

CREATE UNIQUE INDEX room_votes_travel_once
  ON room_votes (room_id, appointment_id, target_user_id)
  WHERE vote_kind = 'TRAVEL_REWARD';

CREATE OR REPLACE FUNCTION apply_room_vote_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET
    social_points = social_points + NEW.points_awarded,
    updated_at = NOW()
  WHERE id = NEW.target_user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER room_votes_apply_points
  AFTER INSERT ON room_votes
  FOR EACH ROW EXECUTE FUNCTION apply_room_vote_points();

ALTER TABLE social_point_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Social titles are public" ON social_point_titles FOR SELECT USING (true);

CREATE POLICY "Members can view own room votes"
  ON room_votes FOR SELECT
  USING (
    voter_id = auth.uid()
    OR target_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = room_votes.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert praise votes"
  ON room_votes FOR INSERT
  WITH CHECK (
    voter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = room_votes.room_id AND user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = room_votes.room_id AND user_id = room_votes.target_user_id
    )
  );
