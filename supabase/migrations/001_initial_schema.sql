-- 우리지금만나: Smart Appointment Management
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM types
-- ============================================================
CREATE TYPE age_group AS ENUM ('TEENS', 'TWENTIES', 'THIRTIES', 'FORTIES', 'FIFTIES_PLUS');
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
CREATE TYPE room_type AS ENUM ('ONE_TIME', 'REGULAR');
CREATE TYPE room_status AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE room_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE appointment_status AS ENUM (
  'draft', 'date_voting', 'time_voting', 'confirmed', 'cancelled'
);
CREATE TYPE place_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
CREATE TYPE recommendation_vote AS ENUM ('RECOMMEND', 'NOT_RECOMMEND');
CREATE TYPE profile_badge_tier AS ENUM ('NONE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- ============================================================
-- Profiles (extends Supabase auth.users)
-- 개인정보 최소화: 실명 수집 없음, 나이대 + 거주지(시/구)만 필수
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  age_group age_group NOT NULL,
  residence TEXT NOT NULL,
  avatar_url TEXT,
  home_address TEXT,
  home_lat DOUBLE PRECISION,
  home_lng DOUBLE PRECISION,
  trust_score INTEGER DEFAULT 0,
  selected_title_id INTEGER,
  badge_tier profile_badge_tier DEFAULT 'NONE',
  role user_role DEFAULT 'USER',
  security_pin_hash TEXT,
  places_adopted_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recommender titles lookup (칭호 시스템)
CREATE TABLE recommender_titles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  min_score INTEGER NOT NULL,
  badge_color TEXT NOT NULL,
  border_style TEXT DEFAULT 'none'
);

INSERT INTO recommender_titles (title, min_score, badge_color, border_style) VALUES
  ('신입 탐험가', 0, '#94A3B8', 'none'),
  ('맛집 발굴단', 10, '#60A5FA', 'bronze'),
  ('미식 가이드', 30, '#34D399', 'silver'),
  ('gourmet 큐레이터', 60, '#FBBF24', 'gold'),
  ('전설의 미식家', 100, '#F472B6', 'platinum');

ALTER TABLE profiles
  ADD CONSTRAINT profiles_selected_title_id_fkey
  FOREIGN KEY (selected_title_id) REFERENCES recommender_titles(id) ON DELETE SET NULL;

-- ============================================================
-- Rooms (휘발성 방 / 정식 고정 그룹)
-- ============================================================
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  room_type room_type DEFAULT 'ONE_TIME',
  room_status room_status DEFAULT 'ACTIVE',
  purpose TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  promoted_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE room_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role room_role DEFAULT 'MEMBER',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE room_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, invitee_id)
);

-- ============================================================
-- Appointments / 2-phase voting
-- ============================================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status appointment_status DEFAULT 'date_voting',
  confirmed_date DATE,
  confirmed_time TIME,
  confirmed_place_id UUID,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE date_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_date DATE NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, user_id, vote_date)
);

CREATE TABLE time_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_date DATE NOT NULL,
  vote_time TIME NOT NULL,
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, user_id, vote_date, vote_time)
);

-- 약속 이행 히스토리 (잔디형 캘린더용)
CREATE TABLE appointment_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attended_on DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, user_id)
);

-- 모임 결산 (센스킹 / 프로 여정러)
CREATE TABLE appointment_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE UNIQUE,
  sense_king_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  pro_traveler_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  pro_travel_duration_minutes INTEGER,
  pro_travel_distance_meters INTEGER,
  settled_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Places / Restaurants with tier system
-- ============================================================
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  category TEXT,
  kakao_place_id TEXT,
  tier place_tier DEFAULT 'bronze',
  avg_rating NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  recommended_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appointments
  ADD CONSTRAINT appointments_confirmed_place_id_fkey
  FOREIGN KEY (confirmed_place_id) REFERENCES places(id) ON DELETE SET NULL;

-- 평점: 4.5점 허용 (NUMERIC), 5점은 월 5회 제한
CREATE TABLE place_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating NUMERIC(2,1) NOT NULL CHECK (
    rating >= 1 AND rating <= 5
    AND (rating * 2) = FLOOR(rating * 2)
  ),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(place_id, user_id)
);

CREATE TABLE user_rating_quota (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  five_star_used INTEGER DEFAULT 0,
  UNIQUE(user_id, month_year)
);

-- 신뢰도: 장소 추천에 대한 추천/비추천 (+1 / -1)
CREATE TABLE place_recommendation_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type recommendation_vote NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(place_id, voter_id)
);

CREATE TABLE appointment_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  vote_count INTEGER DEFAULT 0,
  UNIQUE(appointment_id, place_id)
);

-- 이동 시간 기록 (넛지 UX: "지난 모임 시 소요 시간")
CREATE TABLE user_travel_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL,
  distance_meters INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_travel_logs_user_place ON user_travel_logs(user_id, place_id);
CREATE INDEX idx_appointment_attendance_user ON appointment_attendance(user_id, attended_on);
CREATE INDEX idx_rooms_one_time_activity ON rooms(room_type, room_status, last_activity_at);

-- ============================================================
-- Functions & Triggers
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calc_badge_tier(score INTEGER)
RETURNS profile_badge_tier AS $$
BEGIN
  IF score >= 100 THEN RETURN 'PLATINUM';
  ELSIF score >= 60 THEN RETURN 'GOLD';
  ELSIF score >= 30 THEN RETURN 'SILVER';
  ELSIF score >= 10 THEN RETURN 'BRONZE';
  ELSE RETURN 'NONE';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION sync_profile_trust()
RETURNS TRIGGER AS $$
DECLARE
  recommender UUID;
  delta INTEGER;
BEGIN
  SELECT recommended_by INTO recommender FROM places WHERE id = NEW.place_id;
  IF recommender IS NULL OR recommender = NEW.voter_id THEN
    RETURN NEW;
  END IF;

  delta := CASE NEW.vote_type WHEN 'RECOMMEND' THEN 1 ELSE -1 END;

  UPDATE profiles
  SET
    trust_score = GREATEST(0, trust_score + delta),
    badge_tier = calc_badge_tier(GREATEST(0, trust_score + delta)),
    updated_at = NOW()
  WHERE id = recommender;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER place_recommendation_vote_trust
  AFTER INSERT OR UPDATE OF vote_type ON place_recommendation_votes
  FOR EACH ROW EXECUTE FUNCTION sync_profile_trust();

CREATE OR REPLACE FUNCTION touch_room_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rooms SET last_activity_at = NOW(), updated_at = NOW()
  WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER appointments_touch_room
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION touch_room_activity();

-- 5점 월간 한도 검증 (4.5점은 제한 없음, ADMIN은 앱 레벨에서 bypass)
CREATE OR REPLACE FUNCTION check_five_star_quota()
RETURNS TRIGGER AS $$
DECLARE
  month_key TEXT;
  used_count INTEGER;
  user_role_val user_role;
BEGIN
  IF NEW.rating <> 5 THEN
    RETURN NEW;
  END IF;

  SELECT role INTO user_role_val FROM profiles WHERE id = NEW.user_id;
  IF user_role_val = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  month_key := TO_CHAR(NOW(), 'YYYY-MM');

  SELECT COALESCE(five_star_used, 0) INTO used_count
  FROM user_rating_quota
  WHERE user_id = NEW.user_id AND month_year = month_key;

  IF used_count >= 5 THEN
    RAISE EXCEPTION '이번 달 5점 평가 한도(5회)를 초과했습니다';
  END IF;

  INSERT INTO user_rating_quota (user_id, month_year, five_star_used)
  VALUES (NEW.user_id, month_key, 1)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET five_star_used = user_rating_quota.five_star_used + 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER place_ratings_five_star_quota
  BEFORE INSERT OR UPDATE OF rating ON place_ratings
  FOR EACH ROW EXECUTE FUNCTION check_five_star_quota();

-- ONE_TIME 방: 3개월 미활동 → ARCHIVED, 6개월 ARCHIVED → 삭제
CREATE OR REPLACE FUNCTION archive_inactive_one_time_rooms()
RETURNS void AS $$
BEGIN
  UPDATE rooms
  SET room_status = 'ARCHIVED', archived_at = NOW(), updated_at = NOW()
  WHERE room_type = 'ONE_TIME'
    AND room_status = 'ACTIVE'
    AND last_activity_at < NOW() - INTERVAL '3 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION purge_archived_one_time_rooms()
RETURNS void AS $$
BEGIN
  DELETE FROM rooms
  WHERE room_type = 'ONE_TIME'
    AND room_status = 'ARCHIVED'
    AND archived_at < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create profile on signup (나이대·거주지는 auth metadata에서)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_title_id INTEGER;
BEGIN
  SELECT id INTO default_title_id FROM recommender_titles WHERE min_score = 0 LIMIT 1;

  INSERT INTO profiles (id, display_name, age_group, residence, selected_title_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'age_group')::age_group, 'TWENTIES'),
    COALESCE(NEW.raw_user_meta_data->>'residence', '미입력'),
    default_title_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER places_updated_at BEFORE UPDATE ON places
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_recommendation_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_travel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommender_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Room members can view rooms" ON rooms FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM room_members WHERE room_id = rooms.id AND user_id = auth.uid()
  ));
CREATE POLICY "Authenticated users can create rooms" ON rooms FOR INSERT
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Room owners can update rooms" ON rooms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = rooms.id AND user_id = auth.uid() AND role = 'OWNER'
    )
  );

CREATE POLICY "Members can view room membership" ON room_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM room_members rm
    WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid()
  ));

CREATE POLICY "Recommender titles are public" ON recommender_titles FOR SELECT USING (true);

-- NOTE: Supabase Dashboard → Database → Cron Jobs 에서 아래 함수를 주기적으로 호출하세요
--   SELECT archive_inactive_one_time_rooms();  -- 매일
--   SELECT purge_archived_one_time_rooms();    -- 매일
