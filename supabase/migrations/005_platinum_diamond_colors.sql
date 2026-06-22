-- 플래티넘(밥구르망) → 푸른색, 다이아 → 밝은 시안으로 구분

UPDATE recommender_titles
SET badge_color = '#2563EB'
WHERE border_style = 'platinum';

UPDATE recommender_titles
SET badge_color = '#06B6D4'
WHERE border_style = 'diamond';
