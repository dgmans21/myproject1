-- 우리지금만나 — 통합 스키마 (001/014 legacy 통합)
-- 신규 Supabase: 001 → 002 → 003 순 실행

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM
-- ============================================================
CREATE TYPE age_group AS ENUM ('TEENS', 'TWENTIES', 'THIRTIES', 'FORTIES', 'FIFTIES_PLUS');
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
CREATE TYPE room_type AS ENUM ('ONE_TIME', 'REGULAR', 'TEAM_SCHEDULE');
CREATE TYPE room_status AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE room_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE appointment_status AS ENUM (
  'draft', 'date_voting', 'time_voting', 'confirmed', 'cancelled'
);
CREATE TYPE place_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
CREATE TYPE recommendation_vote AS ENUM ('RECOMMEND', 'NOT_RECOMMEND');
CREATE TYPE profile_badge_tier AS ENUM (
  'NONE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM',
  'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'SUPREME'
);
CREATE TYPE praise_sticker AS ENUM (
  'PUNCTUAL', 'MOOD_MAKER', 'GOOD_LISTENER', 'TEAM_PLAYER', 'LIFE_OF_PARTY'
);
CREATE TYPE room_vote_kind AS ENUM ('PRAISE_STICKER', 'TRAVEL_REWARD');
CREATE TYPE departure_status AS ENUM ('NOT_DEPARTED', 'EN_ROUTE');

COMMENT ON TYPE room_type IS 'ONE_TIME=임시, REGULAR=고정 모임, TEAM_SCHEDULE=팀 일정 공유';

-- ============================================================
-- Lookup: 신뢰도 칭호 · 소셜 칭호
-- ============================================================
CREATE TABLE recommender_titles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  min_score INTEGER NOT NULL,
  badge_color TEXT NOT NULL,
  border_style TEXT DEFAULT 'none'
);

CREATE TABLE social_point_titles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  name_en TEXT,
  min_points INTEGER NOT NULL UNIQUE,
  badge_color TEXT NOT NULL,
  border_style TEXT DEFAULT 'none'
);

-- ============================================================
-- Profiles (auth.users 1:1)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  age_group age_group NOT NULL,
  residence TEXT NOT NULL,
  home_address TEXT,
  home_lat DOUBLE PRECISION,
  home_lng DOUBLE PRECISION,
  trust_score INTEGER DEFAULT 0,
  selected_title_id INTEGER REFERENCES recommender_titles(id) ON DELETE SET NULL,
  badge_tier profile_badge_tier DEFAULT 'NONE',
  social_points INTEGER NOT NULL DEFAULT 0,
  selected_social_title_id INTEGER REFERENCES social_point_titles(id) ON DELETE SET NULL,
  mbti_types TEXT[] NOT NULL DEFAULT '{}',
  profile_decor JSONB NOT NULL DEFAULT '{}'::jsonb,
  role user_role DEFAULT 'USER',
  places_adopted_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT profiles_mbti_max_two CHECK (cardinality(mbti_types) <= 2),
  CONSTRAINT profiles_profile_decor_accent_hex_check CHECK (
    profile_decor->>'accent_color' IS NULL
    OR profile_decor->>'accent_color' ~ '^#[0-9A-Fa-f]{6}$'
  ),
  CONSTRAINT profiles_profile_decor_theme_preset_check CHECK (
    profile_decor->>'theme_preset' IS NULL
    OR profile_decor->>'theme_preset' IN (
      'default', 'warm', 'ocean', 'forest', 'sunset', 'minimal',
      'lavender', 'peach', 'mint', 'berry', 'lemon', 'sky'
    )
  ),
  CONSTRAINT profiles_profile_decor_interest_emojis_check CHECK (
    profile_decor->'interest_emojis' IS NULL
    OR (
      jsonb_typeof(profile_decor->'interest_emojis') = 'array'
      AND jsonb_array_length(profile_decor->'interest_emojis') <= 24
    )
  )
);

COMMENT ON COLUMN profiles.profile_decor IS
  '꾸미기 JSON: chinese_zodiac, western_zodiac, blood_type, accent_color, theme_preset, interest_emojis';

-- PIN 해시 — service role 전용 (RLS 정책 없음)
CREATE TABLE profile_secrets (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  security_pin_hash TEXT
);

COMMENT ON TABLE profile_secrets IS '보안 PIN. 클라이언트 직접 접근 금지 — 백엔드 service role만';

-- ============================================================
-- Rooms
-- ============================================================
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  room_type room_type DEFAULT 'ONE_TIME',
  room_status room_status DEFAULT 'ACTIVE',
  purpose TEXT,
  meeting_purpose TEXT,
  meeting_purpose_custom TEXT,
  is_fixed BOOLEAN NOT NULL DEFAULT false,
  expire_at TIMESTAMPTZ,
  accent_color TEXT,
  join_password_hash TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  promoted_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT rooms_fixed_expire_check CHECK (
    (is_fixed = true AND expire_at IS NULL)
    OR (is_fixed = false AND expire_at IS NOT NULL)
  ),
  CONSTRAINT rooms_meeting_purpose_check CHECK (
    meeting_purpose IS NULL
    OR meeting_purpose IN ('MAJOR_PRESENTATION', 'MONTHLY', 'CASUAL', 'FLASH', 'OTHER')
  ),
  CONSTRAINT rooms_meeting_purpose_other_check CHECK (
    meeting_purpose IS DISTINCT FROM 'OTHER'
    OR meeting_purpose_custom IS NULL
    OR char_length(trim(meeting_purpose_custom)) >= 1
  ),
  CONSTRAINT rooms_accent_color_hex_check CHECK (
    accent_color IS NULL OR accent_color ~ '^#[0-9A-Fa-f]{6}$'
  )
);

COMMENT ON COLUMN rooms.meeting_purpose IS '모임 주목적 enum ID';
COMMENT ON COLUMN rooms.purpose IS '방 설명 자유 텍스트';
COMMENT ON COLUMN rooms.join_password_hash IS '입장 비밀번호 해시 (평문 저장 금지)';

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

CREATE TABLE room_invite_links (
  room_id UUID PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE room_host_transfer_pending (
  room_id UUID PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT room_host_transfer_no_self CHECK (from_user_id <> to_user_id)
);

CREATE TABLE room_activity_days (
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  activity_on DATE NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 1 CHECK (event_count > 0),
  PRIMARY KEY (room_id, activity_on)
);

CREATE TABLE friendships (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id),
  CONSTRAINT friendships_no_self CHECK (user_id <> friend_id)
);

-- ============================================================
-- Team schedule (TEAM_SCHEDULE room)
-- ============================================================
CREATE TABLE team_schedule_day_memos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  memo TEXT NOT NULL CHECK (char_length(trim(memo)) >= 1),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (room_id, user_id, schedule_date)
);

CREATE TABLE team_schedule_week_availability (
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  slot_key TEXT NOT NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (room_id, user_id, week_start, slot_key),
  CONSTRAINT team_schedule_slot_key_format CHECK (slot_key ~ '^\d{4}-\d{2}-\d{2}\|\d{1,2}$')
);

CREATE TABLE team_schedule_week_notes (
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  other_times TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id, week_start)
);

CREATE TABLE team_schedule_milestones (
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  label TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (room_id, item_id)
);

-- ============================================================
-- Appointments · voting
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

CREATE TABLE appointment_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attended_on DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, user_id)
);

CREATE TABLE appointment_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE UNIQUE,
  sense_king_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  pro_traveler_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  pro_travel_duration_minutes INTEGER,
  pro_travel_distance_meters INTEGER,
  settled_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE appointment_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE appointment_member_departure (
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status departure_status NOT NULL DEFAULT 'NOT_DEPARTED',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (appointment_id, user_id)
);

-- ============================================================
-- Places · ratings
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

CREATE TABLE place_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating NUMERIC(2,1) NOT NULL CHECK (
    rating >= 1 AND rating <= 5
    AND (rating * 2) = FLOOR(rating * 2)
  ),
  review TEXT,
  four_half_granted_month TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(place_id, user_id)
);

COMMENT ON COLUMN place_ratings.four_half_granted_month IS
  '4.5점 부여 시 차감된 month_year(YYYY-MM). 4.5→다른점수 시 해당 월 quota 환불에 사용';

CREATE TABLE user_rating_quota (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  five_star_used INTEGER DEFAULT 0,
  four_half_star_used INTEGER DEFAULT 0,
  UNIQUE(user_id, month_year)
);

COMMENT ON COLUMN user_rating_quota.five_star_used IS '레거시 컬럼(v1). v2는 place_ratings 건수로 5점 한도';
COMMENT ON COLUMN user_rating_quota.four_half_star_used IS '해당 month_year의 4.5점 사용 횟수';

CREATE TABLE place_recommendation_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type recommendation_vote NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(place_id, voter_id)
);

CREATE TABLE user_travel_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL,
  distance_meters INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE appointment_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  vote_count INTEGER DEFAULT 0,
  UNIQUE(appointment_id, place_id)
);

-- ============================================================
-- Social votes (칭찬 스티커)
-- ============================================================
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

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_user_travel_logs_user_place ON user_travel_logs(user_id, place_id);
CREATE INDEX idx_appointment_attendance_user ON appointment_attendance(user_id, attended_on);
CREATE INDEX idx_rooms_one_time_activity ON rooms(room_type, room_status, last_activity_at);
CREATE INDEX idx_rooms_expire_at ON rooms (expire_at) WHERE expire_at IS NOT NULL;
CREATE INDEX idx_rooms_last_activity_fixed ON rooms (last_activity_at) WHERE is_fixed = true;
CREATE INDEX idx_room_invite_links_token ON room_invite_links (token);
CREATE INDEX idx_room_members_user ON room_members(user_id);
CREATE INDEX idx_team_schedule_day_memos_room_month ON team_schedule_day_memos (room_id, schedule_date);
CREATE INDEX idx_friendships_user ON friendships (user_id);
CREATE INDEX idx_appointment_comments_apt ON appointment_comments (appointment_id, created_at);

CREATE UNIQUE INDEX room_votes_praise_once
  ON room_votes (room_id, appointment_id, voter_id, target_user_id)
  WHERE vote_kind = 'PRAISE_STICKER';

CREATE UNIQUE INDEX room_votes_travel_once
  ON room_votes (room_id, appointment_id, target_user_id)
  WHERE vote_kind = 'TRAVEL_REWARD';

-- ============================================================
-- Master data
-- ============================================================
INSERT INTO recommender_titles (title, min_score, badge_color, border_style) VALUES
  ('신입 탐험가', 0, '#94A3B8', 'none'),
  ('맛집 발굴단', 10, '#60A5FA', 'bronze'),
  ('미식 가이드', 50, '#34D399', 'silver'),
  ('gourmet 큐레이터', 150, '#FBBF24', 'gold'),
  ('밥구르망', 300, '#2563EB', 'platinum'),
  ('밥슐령가이드', 500, '#10B981', 'emerald'),
  ('다이아 방구석쓰리스타', 750, '#06B6D4', 'diamond'),
  ('마스터 한국의 미식家', 1000, '#1E40AF', 'master'),
  ('전설의 미식왕 그랜드마스터', 2000, '#B45309', 'grandmaster'),
  ('명예 미슐랭 가이드', 3000, '#FFD54F', 'supreme');

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
