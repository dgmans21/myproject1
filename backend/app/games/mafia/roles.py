"""Mafia role constants."""

from __future__ import annotations

ROLE_CITIZEN = "citizen"
ROLE_MAFIA = "mafia"
ROLE_SPY = "spy"
ROLE_DOCTOR = "doctor"
ROLE_POLICE = "police"
ROLE_VIGILANTE = "vigilante"

MAFIA_TEAM = {ROLE_MAFIA, ROLE_SPY}
SPECIAL_ROLES = {ROLE_MAFIA, ROLE_SPY, ROLE_DOCTOR, ROLE_POLICE, ROLE_VIGILANTE}
TOWN_SPECIAL = {ROLE_DOCTOR, ROLE_POLICE, ROLE_VIGILANTE}

ROLE_LABELS_KO = {
    ROLE_CITIZEN: "시민",
    ROLE_MAFIA: "마피아",
    ROLE_SPY: "스파이",
    ROLE_DOCTOR: "의사",
    ROLE_POLICE: "경찰",
    ROLE_VIGILANTE: "자경단",
}

VIGILANTE_FAIL_QUOTE = "멍청한 정의는 현명한 악보다 더 큰 해악이다"
VIGILANTE_ALLY_FAIL_QUOTE = "큰힘에는 큰책임이 따른다"
DOCTOR_SELF_HINT = "나쁜 의사가 자기 자신만 치유하고 있습니다"

MIN_PLAYERS = 5
MAX_PLAYERS = 16
