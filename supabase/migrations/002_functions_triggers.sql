-- 우리지금만나 — 함수 · 트리거 · 뷰 (002)
-- 001_schema.sql 적용 후 실행

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
  IF score >= 3000 THEN RETURN 'SUPREME';
  ELSIF score >= 2000 THEN RETURN 'GRANDMASTER';
  ELSIF score >= 1000 THEN RETURN 'MASTER';
  ELSIF score >= 750 THEN RETURN 'DIAMOND';
  ELSIF score >= 500 THEN RETURN 'EMERALD';
  ELSIF score >= 300 THEN RETURN 'PLATINUM';
  ELSIF score >= 150 THEN RETURN 'GOLD';
  ELSIF score >= 50 THEN RETURN 'SILVER';
  ELSIF score >= 10 THEN RETURN 'BRONZE';
  ELSE RETURN 'NONE';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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
  SET trust_score = next_score, badge_tier = calc_badge_tier(next_score), updated_at = NOW()
  WHERE id = recommender;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  UPDATE rooms SET last_activity_at = NOW(), updated_at = NOW() WHERE id = target_room_id;
  PERFORM log_room_activity_day(target_room_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION enforce_place_rating_quota()
RETURNS TRIGGER AS $$
DECLARE
  user_role_val user_role;
  five_count INTEGER;
  month_key TEXT;
  half_used INTEGER;
BEGIN
  SELECT role INTO user_role_val FROM profiles WHERE id = NEW.user_id;
  IF user_role_val = 'ADMIN' THEN RETURN NEW; END IF;

  IF NEW.rating = 5 AND (TG_OP = 'INSERT' OR OLD.rating IS DISTINCT FROM 5) THEN
    SELECT COUNT(*) INTO five_count
    FROM place_ratings
    WHERE user_id = NEW.user_id AND rating = 5 AND place_id <> NEW.place_id;
    IF five_count >= 5 THEN
      RAISE EXCEPTION '5점은 최대 5곳까지 가능합니다. 기존 5점을 취소한 뒤 다시 시도해 주세요.';
    END IF;
  END IF;

  IF NEW.rating = 4.5 AND (TG_OP = 'INSERT' OR OLD.rating IS DISTINCT FROM 4.5) THEN
    month_key := TO_CHAR(NOW(), 'YYYY-MM');
    SELECT COALESCE(four_half_star_used, 0) INTO half_used
    FROM user_rating_quota WHERE user_id = NEW.user_id AND month_year = month_key;
    IF half_used >= 5 THEN
      RAISE EXCEPTION '이번 달 4.5점 평가 한도(5회)를 초과했습니다';
    END IF;
    INSERT INTO user_rating_quota (user_id, month_year, four_half_star_used)
    VALUES (NEW.user_id, month_key, 1)
    ON CONFLICT (user_id, month_year)
    DO UPDATE SET four_half_star_used = user_rating_quota.four_half_star_used + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_expired_rooms()
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  WITH doomed AS (
    DELETE FROM rooms
    WHERE NOT is_fixed AND expire_at IS NOT NULL AND expire_at <= NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM doomed;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_inactive_fixed_rooms()
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  WITH doomed AS (
    DELETE FROM rooms
    WHERE is_fixed = true AND last_activity_at < NOW() - INTERVAL '3 months'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM doomed;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION archive_inactive_one_time_rooms()
RETURNS void AS $$ BEGIN PERFORM delete_expired_rooms(); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION purge_archived_one_time_rooms()
RETURNS void AS $$ BEGIN PERFORM delete_inactive_fixed_rooms(); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE default_title_id INTEGER;
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

CREATE OR REPLACE FUNCTION apply_room_vote_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET social_points = social_points + NEW.points_awarded, updated_at = NOW()
  WHERE id = NEW.target_user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE OR REPLACE VIEW profiles_public AS
SELECT
  id, display_name, age_group, residence, trust_score, badge_tier,
  selected_title_id, selected_social_title_id, social_points, mbti_types,
  profile_decor, places_adopted_count, role, created_at, updated_at
FROM profiles;

COMMENT ON VIEW profiles_public IS
  '랭킹·멤버 목록용. security_pin_hash·home_address·home_lat/lng 제외';

-- Triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER places_updated_at BEFORE UPDATE ON places
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER place_recommendation_vote_trust
  AFTER INSERT OR UPDATE OF vote_type OR DELETE ON place_recommendation_votes
  FOR EACH ROW EXECUTE FUNCTION sync_profile_trust();

CREATE TRIGGER appointments_touch_room
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION touch_room_activity();

CREATE TRIGGER place_ratings_quota
  BEFORE INSERT OR UPDATE OF rating ON place_ratings
  FOR EACH ROW EXECUTE FUNCTION enforce_place_rating_quota();

CREATE TRIGGER room_votes_apply_points
  AFTER INSERT ON room_votes
  FOR EACH ROW EXECUTE FUNCTION apply_room_vote_points();

CREATE TRIGGER rooms_after_insert_team_schedule
  AFTER INSERT ON rooms
  FOR EACH ROW EXECUTE FUNCTION on_room_created_after();
