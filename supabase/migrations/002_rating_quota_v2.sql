-- 평점 한도 v2: 5점 = 계정당 최대 5곳, 4.5점 = 월 5회
-- 001 적용 후 이 파일을 SQL Editor에서 실행하세요.

ALTER TABLE user_rating_quota
  ADD COLUMN IF NOT EXISTS four_half_star_used INTEGER DEFAULT 0;

COMMENT ON COLUMN user_rating_quota.five_star_used IS '레거시(월간 5점). v2부터 미사용';
COMMENT ON COLUMN user_rating_quota.four_half_star_used IS '해당 month_year의 4.5점 사용 횟수';

DROP TRIGGER IF EXISTS place_ratings_five_star_quota ON place_ratings;
DROP FUNCTION IF EXISTS check_five_star_quota();

CREATE OR REPLACE FUNCTION enforce_place_rating_quota()
RETURNS TRIGGER AS $$
DECLARE
  user_role_val user_role;
  five_count INTEGER;
  month_key TEXT;
  half_used INTEGER;
BEGIN
  SELECT role INTO user_role_val FROM profiles WHERE id = NEW.user_id;
  IF user_role_val = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  -- 5점: 계정당 최대 5곳 (새로 5점을 부여할 때만 검사)
  IF NEW.rating = 5 AND (TG_OP = 'INSERT' OR OLD.rating IS DISTINCT FROM 5) THEN
    SELECT COUNT(*) INTO five_count
    FROM place_ratings
    WHERE user_id = NEW.user_id
      AND rating = 5
      AND place_id <> NEW.place_id;

    IF five_count >= 5 THEN
      RAISE EXCEPTION '5점은 최대 5곳까지 가능합니다. 기존 5점을 취소한 뒤 다시 시도해 주세요.';
    END IF;
  END IF;

  -- 4.5점: 월 5회 (새로 4.5점을 부여할 때만 검사·차감)
  IF NEW.rating = 4.5 AND (TG_OP = 'INSERT' OR OLD.rating IS DISTINCT FROM 4.5) THEN
    month_key := TO_CHAR(NOW(), 'YYYY-MM');

    SELECT COALESCE(four_half_star_used, 0) INTO half_used
    FROM user_rating_quota
    WHERE user_id = NEW.user_id AND month_year = month_key;

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

CREATE TRIGGER place_ratings_quota
  BEFORE INSERT OR UPDATE OF rating ON place_ratings
  FOR EACH ROW EXECUTE FUNCTION enforce_place_rating_quota();
