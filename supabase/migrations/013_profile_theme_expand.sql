-- 프로필 테마 프리셋 12종으로 확장

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_profile_decor_theme_preset_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_profile_decor_theme_preset_check
  CHECK (
    profile_decor->>'theme_preset' IS NULL
    OR profile_decor->>'theme_preset' IN (
      'default', 'warm', 'ocean', 'forest', 'sunset', 'minimal',
      'lavender', 'peach', 'mint', 'berry', 'lemon', 'sky'
    )
  );

COMMENT ON COLUMN profiles.profile_decor IS
  '꾸미기 JSON: chinese_zodiac, western_zodiac, blood_type, accent_color, theme_preset, interest_emojis(유니코드 배열)';
