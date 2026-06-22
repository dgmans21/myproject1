-- 칭호명·border_style korean_michelin 통일 (003 적용 후 실행)

UPDATE recommender_titles
SET border_style = 'korean_michelin'
WHERE min_score >= 1000;

UPDATE recommender_titles
SET title = '전설의 미식왕 그랜드마스터'
WHERE min_score = 1500 AND title = '전설의 미식왕';

UPDATE recommender_titles
SET
  title = '명예 미슐랭 가이드',
  badge_color = '#FFD54F',
  border_style = 'korean_michelin'
WHERE min_score = 2000;
