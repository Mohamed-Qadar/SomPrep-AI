"""Pydantic schemas for the Technology Skills tracks (TechTrack, TechLesson, TechEnrollment, TechQuizAttempt)."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class TechTrackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str
    description: str
    icon: Optional[str] = None
    color: Optional[str] = None
    created_at: datetime
    is_enrolled: bool = False
    progress_percent: float = 0.0

class TechLessonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    order_index: int
    content_type: str
    content_url: Optional[str] = None
    duration_minutes: int
    is_completed: bool = False

class TechTrackDetailOut(TechTrackOut):
    lessons: List[TechLessonOut] = []

class TechEnrollmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    track_id: int
    enrolled_at: datetime
    completed_lessons: List[int]
    progress_percent: float
    completed_at: Optional[datetime] = None
    track_name: Optional[str] = None
    track_slug: Optional[str] = None

class TechQuizSubmit(BaseModel):
    answers: dict  # e.g., {"1": "A", "2": "C"}

class TechQuizResult(BaseModel):
    score: float
    passed: bool
    progress_percent: float
