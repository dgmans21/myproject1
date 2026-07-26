from datetime import date, datetime, time
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class AgeGroup(str, Enum):
    TEENS = "TEENS"
    TWENTIES = "TWENTIES"
    THIRTIES = "THIRTIES"
    FORTIES = "FORTIES"
    FIFTIES = "FIFTIES"
    SIXTIES = "SIXTIES"
    SEVENTIES = "SEVENTIES"
    EIGHTIES_PLUS = "EIGHTIES_PLUS"
    FIFTIES_PLUS = "FIFTIES_PLUS"  # 레거시 — 신규 가입 UI에서는 미사용


class UserRole(str, Enum):
    USER = "USER"
    ADMIN = "ADMIN"


class RoomType(str, Enum):
    ONE_TIME = "ONE_TIME"
    REGULAR = "REGULAR"
    TEAM_SCHEDULE = "TEAM_SCHEDULE"


class RoomStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class MeetingPurpose(str, Enum):
    MAJOR_PRESENTATION = "MAJOR_PRESENTATION"
    MONTHLY = "MONTHLY"
    CASUAL = "CASUAL"
    FLASH = "FLASH"
    GAME_CLUB = "GAME_CLUB"
    OTHER = "OTHER"


class AppointmentStatus(str, Enum):
    draft = "draft"
    date_voting = "date_voting"
    time_voting = "time_voting"
    confirmed = "confirmed"
    cancelled = "cancelled"


class PlaceTier(str, Enum):
    unrated = "unrated"
    bronze = "bronze"
    silver = "silver"
    gold = "gold"
    platinum = "platinum"  # legacy DB value
    platinum_shiny = "platinum_shiny"
    emerald_shiny = "emerald_shiny"
    diamond_shiny = "diamond_shiny"
    master_blue = "master_blue"
    grandmaster_crimson_vermilion = "grandmaster_crimson_vermilion"
    vip_white_gold = "vip_white_gold"


class RecommendationVoteType(str, Enum):
    RECOMMEND = "RECOMMEND"
    NOT_RECOMMEND = "NOT_RECOMMEND"


class PraiseSticker(str, Enum):
    PUNCTUAL = "PUNCTUAL"
    MOOD_MAKER = "MOOD_MAKER"
    GOOD_LISTENER = "GOOD_LISTENER"
    TEAM_PLAYER = "TEAM_PLAYER"
    LIFE_OF_PARTY = "LIFE_OF_PARTY"


class ProfileBadgeTier(str, Enum):
    NONE = "NONE"
    BRONZE = "BRONZE"
    SILVER = "SILVER"
    GOLD = "GOLD"
    PLATINUM = "PLATINUM"
    EMERALD = "EMERALD"
    DIAMOND = "DIAMOND"
    MASTER = "MASTER"
    GRANDMASTER = "GRANDMASTER"
    SUPREME = "SUPREME"


# --- Profile ---
class ProfileDecorFields(BaseModel):
    chinese_zodiac: str | None = None
    western_zodiac: str | None = None
    blood_type: str | None = None
    accent_color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    theme_preset: str | None = None
    interest_emojis: list[str] | None = None


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    residence: str | None = None
    age_group: AgeGroup | None = None
    home_address: str | None = None
    home_lat: float | None = None
    home_lng: float | None = None
    clear_current_departure: bool | None = None
    current_departure_label: str | None = None
    current_departure_address: str | None = None
    current_departure_lat: float | None = None
    current_departure_lng: float | None = None
    selected_title_id: int | None = None
    selected_social_title_id: int | None = None
    mbti_types: list[str] | None = Field(default=None, max_length=2)
    status_message: str | None = Field(default=None, max_length=40)
    profile_decor: ProfileDecorFields | None = None


class SavedLocationCreate(BaseModel):
    label: str
    description: str | None = Field(default=None, max_length=10)
    address: str
    lat: float
    lng: float
    is_default: bool = False


class SavedLocationUpdate(BaseModel):
    label: str | None = None
    description: str | None = Field(default=None, max_length=10)
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    is_default: bool | None = None


class SavedLocationResponse(BaseModel):
    id: UUID
    label: str
    description: str | None = None
    address: str
    lat: float
    lng: float
    is_default: bool
    created_at: datetime | None = None


class RecommenderTitle(BaseModel):
    id: int
    title: str
    min_score: int
    badge_color: str
    border_style: str = "none"


class SocialPointTitle(BaseModel):
    id: int
    title: str
    min_points: int
    badge_color: str
    border_style: str = "none"


class ProfileResponse(BaseModel):
    id: UUID
    display_name: str
    age_group: AgeGroup
    residence: str
    home_address: str | None = None
    home_lat: float | None = None
    home_lng: float | None = None
    current_departure_label: str | None = None
    current_departure_address: str | None = None
    current_departure_lat: float | None = None
    current_departure_lng: float | None = None
    current_departure_set_at: datetime | None = None
    trust_score: int = 0
    social_points: int = 0
    badge_tier: ProfileBadgeTier = ProfileBadgeTier.NONE
    role: UserRole = UserRole.USER
    selected_title_id: int | None = None
    selected_title: str | None = None
    selected_social_title_id: int | None = None
    selected_social_title: str | None = None
    mbti_types: list[str] = []
    profile_decor: dict = Field(default_factory=dict)
    status_message: str | None = None
    places_adopted_count: int = 0
    available_titles: list[RecommenderTitle] = []
    available_social_titles: list[SocialPointTitle] = []


class AttendanceHeatmapDay(BaseModel):
    date: date
    count: int


class RankingEntry(BaseModel):
    rank: int
    user_id: UUID
    display_name: str
    trust_score: int
    residence: str
    selected_title: str | None = None
    badge_color: str | None = None
    badge_tier: ProfileBadgeTier = ProfileBadgeTier.NONE
    is_me: bool = False


class SecurityVerifyRequest(BaseModel):
    pin_or_password: str


# --- Rooms ---
class RoomCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    purpose: str | None = None
    meeting_purpose: MeetingPurpose | None = None
    meeting_purpose_custom: str | None = None
    room_type: RoomType = RoomType.ONE_TIME
    """임시방(ONE_TIME)일 때 필수. 날짜 단위 만료(해당일 23:59 UTC)."""
    expire_date: date | None = None
    accent_color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    join_password: str | None = Field(default=None, min_length=4, max_length=128)


class RoomUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    purpose: str | None = None
    meeting_purpose: MeetingPurpose | None = None
    meeting_purpose_custom: str | None = None
    expire_date: date | None = None
    accent_color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")


class RoomActivityDay(BaseModel):
    activity_on: date
    event_count: int


class RoomResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    room_type: RoomType
    room_status: RoomStatus = RoomStatus.ACTIVE
    purpose: str | None = None
    meeting_purpose: MeetingPurpose | None = None
    meeting_purpose_custom: str | None = None
    is_fixed: bool = False
    expire_at: str | None = None
    last_activity_at: str | None = None
    accent_color: str | None = None
    member_count: int = 0
    created_at: str
    requires_join_password: bool = False
    is_me_owner: bool = False


class RoomInvitationItem(BaseModel):
    id: UUID
    room_id: UUID
    room_name: str
    inviter_display_name: str
    status: str


class FriendSummary(BaseModel):
    user_id: UUID
    display_name: str


class InviteLinkInfo(BaseModel):
    room_id: UUID
    token: str
    expires_at: str
    url: str


class InviteTokenPreview(BaseModel):
    room_id: UUID
    room_name: str
    expires_at: str
    expired: bool
    is_member: bool
    requires_join_password: bool


class JoinPreview(BaseModel):
    room_id: UUID
    room_name: str
    requires_join_password: bool
    is_member: bool


class JoinPasswordUpdate(BaseModel):
    password: str | None = Field(default=None, max_length=128)


class JoinWithPasswordRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=128)


class RoomInviteRequest(BaseModel):
    invitee_id: UUID


class RoomMemberAction(BaseModel):
    user_id: UUID


class RoomMemberSummary(BaseModel):
    user_id: UUID
    display_name: str
    role: str
    social_points: int = 0
    social_title: str | None = None
    social_badge_color: str | None = None
    mbti_types: list[str] = []
    is_me: bool = False


class PraiseVoteCreate(BaseModel):
    target_user_id: UUID
    sticker: PraiseSticker


class PraiseVoteSent(BaseModel):
    target_user_id: UUID
    sticker: PraiseSticker
    points_awarded: int


class PraiseVotePendingTarget(BaseModel):
    user_id: UUID
    display_name: str


class PraiseVoteStatusResponse(BaseModel):
    my_votes: list[PraiseVoteSent]
    pending_targets: list[PraiseVotePendingTarget]
    points_per_vote: int = 5


class TravelRewardCreate(BaseModel):
    target_user_id: UUID


# --- Appointments ---
class AppointmentCreate(BaseModel):
    room_id: UUID
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None


class AppointmentResponse(BaseModel):
    id: UUID
    room_id: UUID
    title: str
    description: str | None = None
    status: AppointmentStatus
    confirmed_date: date | None = None
    confirmed_time: time | None = None
    confirmed_place_id: UUID | None = None
    created_at: str


class DateVoteCreate(BaseModel):
    vote_date: date
    is_available: bool = True


class TimeVoteCreate(BaseModel):
    vote_date: date
    vote_time: time
    priority: int = Field(default=1, ge=1, le=3)


class VoteSummary(BaseModel):
    vote_date: date
    available_count: int
    total_members: int
    availability_rate: float


class TimeSlotSummary(BaseModel):
    vote_date: date
    vote_time: time
    vote_count: int
    total_score: int


class MeetingSettlement(BaseModel):
    sense_king_user_id: UUID | None = None
    sense_king_name: str | None = None
    sense_king_adopted_count: int = 0
    pro_traveler_user_id: UUID | None = None
    pro_traveler_name: str | None = None
    pro_travel_duration_minutes: int | None = None
    pro_travel_distance_meters: int | None = None


# --- Places ---
class PlaceCreate(BaseModel):
    name: str
    address: str
    lat: float
    lng: float
    category: str | None = None
    kakao_place_id: str | None = None
    room_id: UUID | None = None


class TopRankerPlaceEndorsement(BaseModel):
    rank: int
    user_id: UUID
    display_name: str


class PlaceResponse(BaseModel):
    id: UUID
    name: str
    address: str
    lat: float
    lng: float
    category: str | None = None
    tier: PlaceTier
    avg_rating: float
    rating_count: int
    recommender_title: str | None = None
    past_travel_hint: str | None = None
    top_ranker_endorsement: TopRankerPlaceEndorsement | None = None
    is_mine: bool = False


class PlaceRatingCreate(BaseModel):
    rating: float = Field(..., ge=1, le=5)
    review: str | None = None
    replace_place_id: UUID | None = None


class FiveStarPlaceItem(BaseModel):
    place_id: UUID
    place_name: str


class FiveStarQuotaInfo(BaseModel):
    used: int
    max: int
    places: list[FiveStarPlaceItem]


class FourHalfQuotaInfo(BaseModel):
    used: int
    max: int
    month_year: str


class RatingQuotaResponse(BaseModel):
    five_star: FiveStarQuotaInfo
    four_half: FourHalfQuotaInfo


class PlaceRecommendationVoteCreate(BaseModel):
    vote_type: RecommendationVoteType


class PlaceReviewItem(BaseModel):
    user_id: UUID
    display_name: str
    rating: float
    review: str
    created_at: datetime
    is_me: bool = False
    is_seed_demo: bool = False
    mbti_types: list[str] = []
    profile_decor: dict = Field(default_factory=dict)


class PlaceReviewsResponse(BaseModel):
    place_id: UUID
    place_name: str
    reviews: list[PlaceReviewItem]
    review_count: int


class TravelTimeRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float
    place_id: UUID | None = None
    appointment_id: UUID | None = None


class TravelTimeResponse(BaseModel):
    duration_minutes: int
    distance_meters: int
    route_summary: str


class RoutePoint(BaseModel):
    lat: float
    lng: float


class TravelRouteResponse(TravelTimeResponse):
    """길찾기 결과 + 지도 폴리라인 (카카오모빌리티 directions)"""

    polyline: list[RoutePoint] = Field(default_factory=list)


class DepartureStatus(str, Enum):
    NOT_DEPARTED = "NOT_DEPARTED"
    EN_ROUTE = "EN_ROUTE"


class AppointmentCommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=500)


class AppointmentCommentResponse(BaseModel):
    id: str
    user_id: str
    display_name: str
    body: str
    created_at: datetime
    is_me: bool = False


class MemberBriefingStatus(BaseModel):
    user_id: str
    display_name: str
    origin_label: str
    duration_minutes: int | None = None
    distance_meters: int | None = None
    estimated_arrival: str | None = None
    punctuality: str = "unknown"
    departure_status: DepartureStatus = DepartureStatus.NOT_DEPARTED
    is_me: bool = False


class AppointmentBriefingResponse(BaseModel):
    appointment_id: str
    title: str
    confirmed_date: date
    confirmed_time: time
    place_name: str
    place_address: str
    minutes_until_start: int
    meeting_ended: bool
    members: list[MemberBriefingStatus]
    comments: list[AppointmentCommentResponse]


class DepartureStatusUpdate(BaseModel):
    status: DepartureStatus


class SiteVisitRecordRequest(BaseModel):
    path: str = "/"
    session_key: str | None = None
    user_agent: str | None = None
    referrer: str | None = None


class SiteVisitTodayCountResponse(BaseModel):
    count: int
    date: str


class SiteVisitEventItem(BaseModel):
    id: str
    visited_at: datetime
    session_key: str
    user_id: str | None = None
    display_name: str | None = None
    path: str
    browser_family: str
    os_family: str
    ip_hash: str
    ip_masked: str | None = None
    user_agent: str | None = None
    referrer: str | None = None


class SiteVisitListResponse(BaseModel):
    items: list[SiteVisitEventItem]
    total: int
    limit: int
    offset: int


class MeetingMemoryMemoUpsert(BaseModel):
    body: str = Field(default="", max_length=2000)


class MeetingMemoryMemoItem(BaseModel):
    id: str
    user_id: str
    display_name: str
    body: str
    created_at: datetime
    updated_at: datetime
    is_me: bool = False


class MeetingMemoryListItem(BaseModel):
    appointment_id: str
    room_id: str
    room_name: str
    room_type: str
    title: str
    confirmed_date: date
    confirmed_time: time
    place_id: str | None = None
    place_name: str | None = None
    my_memo_preview: str | None = None
    my_memo_updated_at: datetime | None = None
    memo_count: int = 0


class FriendCreate(BaseModel):
    friend_id: UUID


class ProfileSearchHit(BaseModel):
    user_id: UUID
    display_name: str
    residence: str | None = None


class HostTransferRequest(BaseModel):
    target_user_id: UUID


class HostTransferRespond(BaseModel):
    accept: bool


class HostTransferCandidate(BaseModel):
    user_id: UUID
    display_name: str


class HostTransferPendingInfo(BaseModel):
    from_user_id: UUID
    from_display_name: str
    to_user_id: UUID
    to_display_name: str
    is_for_me: bool


class HostTransferStatusResponse(BaseModel):
    owner_user_id: UUID | None = None
    owner_display_name: str | None = None
    is_me_owner: bool = False
    pending: HostTransferPendingInfo | None = None
    transfer_candidates: list[HostTransferCandidate] = []


class TeamScheduleDayMemoResponse(BaseModel):
    id: str
    room_id: str
    user_id: str
    display_name: str
    schedule_date: str
    memo: str
    updated_at: datetime


class TeamScheduleMemoUpsert(BaseModel):
    schedule_date: date
    memo: str = Field(default="", max_length=2000)


class TeamScheduleMemberWeek(BaseModel):
    user_id: str
    display_name: str
    is_me: bool = False
    slots: dict[str, bool] = {}
    other_times: str = ""


class TeamScheduleWeekBoard(BaseModel):
    room_id: str
    week_start: str
    members: list[TeamScheduleMemberWeek]
    slot_counts: dict[str, int] = {}


class TeamScheduleWeekSave(BaseModel):
    week_start: date
    slots: dict[str, bool] = {}
    other_times: str = Field(default="", max_length=2000)


class TeamMilestoneItem(BaseModel):
    id: str
    label: str
    done: bool = False
