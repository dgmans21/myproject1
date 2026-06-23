-- 칭호 체계 v3 (001 적용 후 실행)
-- recommender_titles 전량 교체 · calc_badge_tier · 상위 3칭호 border_style 구분

ALTER TYPE profile_badge_tier ADD VALUE IF NOT EXISTS 'SUPREME';

UPDATE profiles SET selected_title_id = NULL WHERE selected_title_id IS NOT NULL;

DELETE FROM recommender_titles;

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

UPDATE profiles
SET selected_title_id = (SELECT id FROM recommender_titles WHERE min_score = 0 LIMIT 1)
WHERE selected_title_id IS NULL;

-- backend/app/services/trust.py BADGE_TIER_THRESHOLDS 와 동일
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

UPDATE profiles
SET badge_tier = calc_badge_tier(trust_score);
