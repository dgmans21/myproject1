-- 이미지 업로드 기능 검토 전까지 avatar_url 컬럼 제거

ALTER TABLE profiles DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE rooms DROP COLUMN IF EXISTS avatar_url;
