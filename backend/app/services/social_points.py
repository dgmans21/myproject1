PRAISE_STICKER_POINTS = 5
TRAVEL_REWARD_POINTS = 10

SOCIAL_TITLE_THRESHOLDS = [
    (15000, "방구석 미슐랭"),
    (10000, "구석 VIP"),
    (5000, "전설의 MC"),
    (3000, "핵인싸"),
    (2000, "분위기 메이커"),
    (1000, "약속요정"),
    (800, "인싸 새싹"),
    (400, "모임 요정"),
    (200, "분위기 씨앗"),
    (100, "약속 지킴이"),
    (0, "방구석 새내기"),
]

VALID_MBTI = {
    "INTJ", "INTP", "ENTJ", "ENTP",
    "INFJ", "INFP", "ENFJ", "ENFP",
    "ISTJ", "ISFJ", "ESTJ", "ESFJ",
    "ISTP", "ISFP", "ESTP", "ESFP",
}


def calc_social_title_for_points(points: int) -> str:
    for threshold, title in SOCIAL_TITLE_THRESHOLDS:
        if points >= threshold:
            return title
    return "방구석 새내기"


def validate_mbti_types(types: list[str]) -> list[str]:
    if len(types) > 2:
        raise ValueError("MBTI는 최대 2개까지 선택할 수 있습니다")
    normalized = []
    for t in types:
        key = t.strip().upper()
        if key not in VALID_MBTI:
            raise ValueError(f"유효하지 않은 MBTI: {t}")
        if key not in normalized:
            normalized.append(key)
    return normalized
