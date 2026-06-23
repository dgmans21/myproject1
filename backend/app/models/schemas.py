from datetime import date, datetime, time
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class AgeGroup(str, Enum):
    TEENS = "TEENS"
    TWENTIES = "TWENTIES"
    THIRTIES = "THIRTIES"
    FORTIES = "FORTIES"
    FIFTIES_PLUS = "FIFTIES_PLUS"


class UserRole(str, Enum):
    USER = "USER"
    ADMIN = "ADMIN"


class RoomType(str, Enum):
    ONE_TIME = "ONE_TIME"
    REGULAR = "REGULAR"


class RoomStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class AppointmentStatus(str, Enum):
    draft = "draft"
    date_voting = "date_voting"
    time_voting = "time_voting"
    confirmed = "confirmed"
    cancelled = "cancelled"


class PlaceTier(str, Enum):
    bronze = "bronze"
    silver = "silver"
    gold = "gold"
    platinum = "platinum"


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
class ProfileUpdate(BaseModel):
    display_name: str | None = None
    residence: str | None = None
    age_group: AgeGroup | None = None
    home_address: str | None = None
    home_lat: float | None = None
    home_lng: float | None = None
    selected_title_id: int | None = None
    selected_social_title_id: int | None = None
    mbti_types: list[str] | None = Field(default=None, max_length=2)


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
    trust_score: int = 0
    social_points: int = 0
    badge_tier: ProfileBadgeTier = ProfileBadgeTier.NONE
    role: UserRole = UserRole.USER
    selected_title_id: int | None = None
    selected_title: str | None = None
    selected_social_title_id: int | None = None
    selected_social_title: str | None = None
    mbti_types: list[str] = []
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
    room_type: RoomType = RoomType.ONE_TIME
    """임시방(ONE_TIME)일 때 필수. 날짜 단위 만료(해당일 23:59 UTC)."""
    expire_date: date | None = None


class RoomUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    purpose: str | None = None
    expire_date: date | None = None


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
    is_fixed: bool = False
    expire_at: str | None = None
    last_activity_at: str | None = None
    member_count: int = 0
    created_at: str


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
