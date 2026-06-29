-- 프로필 꾸미기: JSONB (코드 ID + 테마 문자열 + 강조색)
-- HTML/CSS 저장 없음 — 짧은 문자열만 보관

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_decor JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_profile_decor_accent_hex_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_profile_decor_accent_hex_check
  CHECK (
    profile_decor->>'accent_color' IS NULL
    OR profile_decor->>'accent_color' ~ '^#[0-9A-Fa-f]{6}$'
  );

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_profile_decor_theme_preset_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_profile_decor_theme_preset_check
  CHECK (
    profile_decor->>'theme_preset' IS NULL
    OR profile_decor->>'theme_preset' IN (
      'default', 'warm', 'ocean', 'forest', 'sunset', 'minimal'
    )
  );

COMMENT ON COLUMN profiles.profile_decor IS
  '꾸미기 JSON: chinese_zodiac, western_zodiac, blood_type (코드), accent_color (#RRGGBB), theme_preset (프리셋 ID)';
