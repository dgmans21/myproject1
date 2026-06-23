export const PRAISE_STICKER_LABELS: Record<string, string> = {
  PUNCTUAL: "⏰ 약속 지킴",
  MOOD_MAKER: "✨ 분위기 메이커",
  GOOD_LISTENER: "👂 좋은 리스너",
  TEAM_PLAYER: "🤝 팀플레이어",
  LIFE_OF_PARTY: "🎉 인싸",
};

export const SOCIAL_POINT_TITLES = [
  { id: 1, title: "방구석 새내기", name_en: "Homebody Rookie", min_points: 0, badge_color: "#94A3B8", border_style: "none" },
  { id: 2, title: "약속 지킴이", name_en: "Promise Keeper", min_points: 100, badge_color: "#CD7F32", border_style: "bronze" }, // 동색
  { id: 3, title: "분위기 메이커", name_en: "Mood Maker", min_points: 200, badge_color: "#C0C0C0", border_style: "silver" }, // 은색
  { id: 4, title: "모임 요정", name_en: "Meetup Fairy", min_points: 400, badge_color: "#DAA520", border_style: "gold_shiny" }, // 금색 + 반짝임
  { id: 5, title: "인싸 새싹", name_en: "Inssa Sprout", min_points: 800, badge_color: "#E5E4E2", border_style: "platinum_shiny" }, // 백금 + 반짝임
  { id: 6, title: "방장 후보생", name_en: "Leader Cadet", min_points: 1000, badge_color: "#50C878", border_style: "emerald_shiny" }, // 에메랄드 + 반짝임
  { id: 7, title: "분위기 마스터", name_en: "Mood Master", min_points: 2000, badge_color: "#B9F2FF", border_style: "diamond_shiny" }, // 다이아 + 반짝임
  { id: 8, title: "핵인싸", name_en: "Super Inssa", min_points: 3000, badge_color: "#2563EB", border_style: "master_blue" }, // 파란 계열
  { id: 9, title: "보급형 유재석", name_en: "Legendary MC", min_points: 5000, badge_color: "#E11D48", border_style: "grandmaster_red_gold" }, // 붉은색+금색 중간
  { id: 10, title: "모임 VIP", name_en: "Meetup VIP", min_points: 10000, badge_color: "#FDE047", border_style: "vip_white_gold" }, // 금색 베이스+흰빛
  { id: 11, title: "핵인싸_모임장", name_en: "Immortal Inssa", min_points: 15000, badge_color: "#DC2626", border_style: "immortal_red_aura" }, // 붉은 톤+붉은 오오라
] as const;
