from datetime import date, time
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class GroupType(str, Enum):
    ephemeral = "ephemeral"
    formal = "formal"


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


# --- Profile ---
class ProfileUpdate(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None
    home_address: str | None = None
    home_lat: float | None = None
    home_lng: float | None = None


class ProfileResponse(BaseModel):
    id: UUID
    display_name: str
    avatar_url: str | None = None
    home_address: str | None = None
    home_lat: float | None = None
    home_lng: float | None = None
    recommender_title: str = "신입 탐험가"
    recommender_score: int = 0


# --- Groups ---
class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    purpose: str | None = None
    group_type: GroupType = GroupType.ephemeral
    expires_at: str | None = None


class GroupResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    group_type: GroupType
    purpose: str | None = None
    member_count: int = 0
    created_at: str


class GroupPromoteRequest(BaseModel):
    pass


# --- Appointments ---
class AppointmentCreate(BaseModel):
    group_id: UUID
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None


class AppointmentResponse(BaseModel):
    id: UUID
    group_id: UUID
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


# --- Places ---
class PlaceCreate(BaseModel):
    name: str
    address: str
    lat: float
    lng: float
    category: str | None = None
    kakao_place_id: str | None = None
    group_id: UUID | None = None


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


class PlaceRatingCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    review: str | None = None


class TravelTimeRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float


class TravelTimeResponse(BaseModel):
    duration_minutes: int
    distance_meters: int
    route_summary: str
