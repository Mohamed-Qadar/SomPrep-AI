import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


# ─────────────────────────────────────────────────────────────────────────────
# USER SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    phone_number: str = Field(..., description="Student/Admin phone number (e.g., +25261xxxxxxx)")
    full_name: str = Field(..., min_length=2, max_length=100)
    role: str = Field(default="student", description="Role of user (student, teacher, or admin)")


class UserCreate(UserBase):
    # SECURITY: public registration can only ever create students. Teachers are
    # created by admins (/api/admin/create-teacher); admins are seeded/managed
    # directly. Any other value is rejected with 422 — never trusted.
    role: str = Field(default="student", pattern="^student$")
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters long")
    package_type: str = Field(..., min_length=2, max_length=80, description="Package slug selected from the admin-managed package catalog.")

    @field_validator("phone_number")
    @classmethod
    def validate_somali_phone(cls, v: str) -> str:
        digits = "".join(ch for ch in v if ch.isdigit())
        for prefix in ("00252", "252"):
            if digits.startswith(prefix):
                digits = digits[len(prefix):]
                break
        if digits.startswith("0") and len(digits) == 10:
            digits = digits[1:]
        if len(digits) != 9 or digits[0] not in "679":
            raise ValueError(
                "Invalid phone number. Use a Somali mobile number, e.g. 61xxxxxxx or +25261xxxxxxx."
            )
        return v
    selected_region: str = Field(default="Federal", description="Federal, Puntland, or Somaliland")
    grade_level: int = Field(default=12, ge=1, le=12, description="School Grade Level (1-12)")
    education_level: str = Field(default="Secondary", description="Primary, Middle, or Secondary")
    learning_goal: str = Field(default="Daily Learning", description="Goal of study")
    learner_type: str = Field(default="school_student", description="Learner type for academic or technology skills pathways")


class UserLogin(BaseModel):
    phone_number: str = Field(..., description="Phone number used during registration")
    password: str = Field(...)


class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime.datetime
    selected_region: str
    grade_level: int
    education_level: str
    learning_goal: str
    learner_type: str = "school_student"
    current_streak: int = 0
    total_xp_points: int = 0
    
    # Package subscription fields
    package_type: Optional[str] = None
    package_paid_at: Optional[datetime.datetime] = None
    package_expires_at: Optional[datetime.datetime] = None
    package_active: bool = False

    model_config = ConfigDict(from_attributes=True)


class MyPackageOut(BaseModel):
    package_type: Optional[str] = None
    package_access_scope: Optional[str] = None
    grade_level: int
    package_active: bool
    package_expires_at: Optional[datetime.datetime] = None
    allowed_grades: List[int]
    days_remaining: int


class PackagePlanBase(BaseModel):
    slug: str = Field(..., min_length=2, max_length=80, pattern=r"^[a-z0-9][a-z0-9-]*$")
    name: str = Field(..., min_length=2, max_length=100)
    display_title: Optional[str] = Field(default=None, max_length=120)
    category: str = Field(default="academic", pattern="^(academic|technology|other)$")
    audience: Optional[str] = Field(default=None, max_length=200)
    target: Optional[str] = Field(default=None, max_length=200)
    grade_range: str = Field(default="", max_length=50)
    access_scope: str = Field(default="academic", pattern="^(academic|primary|middle|secondary|technology|none)$")
    annual_price: float = Field(..., ge=0)
    monthly_price: Optional[float] = Field(default=None, ge=0)
    currency: str = Field(default="USD", max_length=10)
    duration_months: int = Field(default=12, ge=1, le=60)
    is_active: bool = True
    features: List[str] = Field(default_factory=list)
    button_label: Optional[str] = Field(default=None, max_length=100)
    details_path: Optional[str] = Field(default=None, max_length=200)
    sort_order: int = 100


class PackagePlanCreate(PackagePlanBase):
    pass


class PackagePlanUpdate(BaseModel):
    slug: Optional[str] = Field(default=None, min_length=2, max_length=80, pattern=r"^[a-z0-9][a-z0-9-]*$")
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    display_title: Optional[str] = Field(default=None, max_length=120)
    category: Optional[str] = Field(default=None, pattern="^(academic|technology|other)$")
    audience: Optional[str] = Field(default=None, max_length=200)
    target: Optional[str] = Field(default=None, max_length=200)
    grade_range: Optional[str] = Field(default=None, max_length=50)
    access_scope: Optional[str] = Field(default=None, pattern="^(academic|primary|middle|secondary|technology|none)$")
    annual_price: Optional[float] = Field(default=None, ge=0)
    monthly_price: Optional[float] = Field(default=None, ge=0)
    currency: Optional[str] = Field(default=None, max_length=10)
    duration_months: Optional[int] = Field(default=None, ge=1, le=60)
    is_active: Optional[bool] = None
    features: Optional[List[str]] = None
    button_label: Optional[str] = Field(default=None, max_length=100)
    details_path: Optional[str] = Field(default=None, max_length=200)
    sort_order: Optional[int] = None


class PackagePlanOut(PackagePlanBase):
    id: int
    title: str

    model_config = ConfigDict(from_attributes=True)


class PackageSelectPayload(BaseModel):
    package_type: str = Field(..., min_length=2, max_length=80)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminLoginRequest(BaseModel):
    phone_number: str = Field(..., description="Admin phone number")
    password: str = Field(..., min_length=6)


class AdminPasswordResetRequest(BaseModel):
    phone_number: str = Field(..., description="Admin phone number")
    channel: str = Field(default="sms", pattern="^(sms|email)$")


class AdminPasswordResetRequestOut(BaseModel):
    reset_id: int
    message: str
    destination: str
    expires_in_minutes: int = 10
    debug_otp: Optional[str] = None


class AdminPasswordResetVerify(BaseModel):
    reset_id: int
    otp: str = Field(..., min_length=6, max_length=6)


class AdminPasswordResetVerifyOut(BaseModel):
    reset_token: str
    message: str


class AdminPasswordResetConfirm(BaseModel):
    reset_id: int
    reset_token: str = Field(..., min_length=20)
    new_password: str = Field(..., min_length=8, max_length=128)


class AdminPasswordResetConfirmOut(BaseModel):
    message: str


class TokenData(BaseModel):
    phone_number: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None


# ─────────────────────────────────────────────────────────────────────────────
# SUBSCRIPTION SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class SubscribeRequest(BaseModel):
    phone_number: str = Field(
        ...,
        description="EVC Plus account phone number (e.g. +25261xxxxxxx or 61xxxxxxx)",
        min_length=9,
        max_length=20,
    )


class SubscriptionStatusOut(BaseModel):
    is_active: bool
    expires_at: Optional[datetime.datetime] = None
    activated_at: Optional[datetime.datetime] = None
    price_paid: float = 2.50

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# EVC PLUS PAYMENT SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class EVCPlusPaymentRequest(BaseModel):
    package_id: str = Field(..., description="Package identifier, e.g. 'office-skills'")
    billing_cycle: str = Field(
        ..., pattern="^(annual|monthly)$", description="'annual' or 'monthly'"
    )
    amount: float = Field(..., gt=0, description="Amount in USD for the selected billing cycle")
    currency: str = Field(default="USD", description="ISO currency code (USD only)")
    evc_phone: str = Field(
        ..., min_length=7, max_length=20, description="EVC Plus phone number"
    )


class EVCPlusPaymentResponse(BaseModel):
    success: bool
    transaction_id: str
    status: str  # 'pending', 'confirmed', 'failed'
    message: str


class EVCPlusConfirmRequest(BaseModel):
    transaction_id: str = Field(..., description="The transaction_id of the pending payment request")


# ─────────────────────────────────────────────────────────────────────────────
# CATEGORY SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class CategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    icon_slug: Optional[str] = None
    grade_level: int = 12
    regional_board: str = "Federal"


class CategoryCreate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# TOPIC SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class TopicBase(BaseModel):
    category_id: int
    name: str = Field(..., max_length=100)
    order_index: int = 0


class TopicCreate(TopicBase):
    pass


class TopicOut(TopicBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# SUBTOPIC SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class SubTopicBase(BaseModel):
    category_id: int
    topic_id: Optional[int] = None
    name: str = Field(..., max_length=100)
    order_index: int = 0
    icon_slug: Optional[str] = None
    prerequisite_subtopic_id: Optional[int] = None


class SubTopicCreate(SubTopicBase):
    pass


class SubTopicOut(SubTopicBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# VIDEO LESSON SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class VideoLessonBase(BaseModel):
    subtopic_id: int
    title: str = Field(..., max_length=200)
    video_url: str = Field(..., max_length=500)
    duration: int = 0
    order_index: int = 0


class VideoLessonCreate(VideoLessonBase):
    pass


class VideoLessonOut(VideoLessonBase):
    id: int
    is_watched: bool = False
    watched_seconds: int = 0
    is_completed: bool = False

    model_config = ConfigDict(from_attributes=True)


class VideoWatchLogSubmit(BaseModel):
    video_id: int
    watched_seconds: int


# ─────────────────────────────────────────────────────────────────────────────
# CHOICE SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class ChoiceBase(BaseModel):
    choice_text: str = Field(..., description="Choice content")


class ChoiceCreate(ChoiceBase):
    is_correct: bool = Field(default=False, description="Flag indicating if choice is correct")


class ChoiceOut(ChoiceBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class ChoiceFullOut(ChoiceBase):
    id: int
    is_correct: bool

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# MOCK EXAM SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class MockExamBase(BaseModel):
    title: str
    regional_board: str
    grade_level: int
    duration_minutes: int = 120


class MockExamCreate(MockExamBase):
    pass


class MockExamOut(MockExamBase):
    id: int
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# QUESTION SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class QuestionBase(BaseModel):
    question_text: str = Field(..., description="Text of the question")
    difficulty_level: str = Field(default="medium", description="Difficulty level ('easy', 'medium', 'hard')")
    language: str = Field(default="so", description="Language ('en', 'so', 'ar')")
    source_type: str = Field(default="teacher_drafted", description="Exam style/source type")
    review_status: str = Field(default="approved", description="Review status ('draft', 'pending_review', 'approved', 'rejected')")


class QuestionCreate(QuestionBase):
    subtopic_id: int
    mock_exam_id: Optional[int] = None
    explanation_text: Optional[str] = Field(default=None, description="Explanation text for correct choices")
    explanation_video_url: Optional[str] = Field(default=None, description="Video walkthrough link")
    reflex_step_title: Optional[str] = Field(
        default=None,
        description="Short reflex headline e.g. 'Reflex 1: Identify root → Reflex 2: Simplify'"
    )
    choices: List[ChoiceCreate] = Field(..., min_length=2, description="At least two choices must be provided")


class QuestionOut(QuestionBase):
    id: int
    subtopic_id: int
    mock_exam_id: Optional[int] = None
    choices: List[ChoiceOut]

    model_config = ConfigDict(from_attributes=True)


class QuestionFullOut(QuestionBase):
    id: int
    subtopic_id: int
    mock_exam_id: Optional[int] = None
    explanation_text: Optional[str] = None
    explanation_video_url: Optional[str] = None
    reflex_step_title: Optional[str] = None
    reviewer_id: Optional[int] = None
    version: int = 1
    choices: List[ChoiceFullOut]

    model_config = ConfigDict(from_attributes=True)


class QuestionReviewRequest(BaseModel):
    status: str = Field(..., description="approved or rejected")
    rejection_reason: Optional[str] = None



# ─────────────────────────────────────────────────────────────────────────────
# EXAM SUBMISSION SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class AnswerSubmit(BaseModel):
    question_id: int = Field(..., description="ID of the question answered")
    chosen_choice_id: int = Field(..., description="ID of the chosen choice")


class ExamSubmit(BaseModel):
    subtopic_id: Optional[int] = Field(default=None, description="ID of the subtopic of the exam")
    category_id: Optional[int] = Field(default=None, description="ID of the category (fallback for legacy frontend)")
    answers: List[AnswerSubmit] = Field(..., description="List of answers submitted by student")


# ─────────────────────────────────────────────────────────────────────────────
# EXAM ATTEMPT SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class ExamAttemptBase(BaseModel):
    score: float = Field(..., description="Percentage or aggregate score")
    total_questions: int = Field(..., description="Total questions in the attempt")
    correct_answers: int = Field(..., description="Number of correct answers")
    wrong_answers: int = Field(..., description="Number of incorrect answers")


class ExamAttemptCreate(ExamAttemptBase):
    user_id: int
    subtopic_id: int


class ExamAttemptOut(ExamAttemptBase):
    id: int
    user_id: int
    subtopic_id: Optional[int] = None
    mock_exam_id: Optional[int] = None
    time_spent_seconds: int = 0
    completed_at: datetime.datetime
    ai_insight: Optional[str] = None
    subtopic: Optional[SubTopicOut] = None
    category: Optional[CategoryOut] = None
    mock_exam: Optional[MockExamOut] = None

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# STUDENT PROGRESS SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class StudentProgressBase(BaseModel):
    user_id: int
    subtopic_id: int
    is_completed: bool = False
    points_earned: int = 0
    stars_awarded: int = 0


class StudentProgressCreate(StudentProgressBase):
    pass


class StudentProgressOut(StudentProgressBase):
    id: int
    unlocked_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# AI COACH SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class AICoachLogBase(BaseModel):
    coach_message: str
    suggestion_type: str = "focus_needed"
    mood_type: str = "motivational"


class AICoachLogCreate(AICoachLogBase):
    user_id: int


class AICoachLogOut(AICoachLogBase):
    id: int
    user_id: int
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class AICoachBriefOut(BaseModel):
    coach_message: str
    suggestion_type: str
    mood_type: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# ROADMAP & SMART ENGINE SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class SubTopicProgressOut(BaseModel):
    id: int
    category_id: int
    topic_id: Optional[int] = None
    name: str
    order_index: int
    icon_slug: Optional[str] = None
    prerequisite_subtopic_id: Optional[int] = None
    is_completed: bool = False
    points_earned: int = 0
    stars_awarded: int = 0       # 0=not attempted, 1-3 stars
    is_unlocked: bool = True
    
    # Video details on roadmap nodes
    video_completed_count: int = 0
    total_videos_count: int = 0
    is_video_completed: bool = False

    model_config = ConfigDict(from_attributes=True)


class TopicRoadmapOut(BaseModel):
    id: int
    name: str
    order_index: int
    subtopics: List[SubTopicProgressOut]

    model_config = ConfigDict(from_attributes=True)


class CategoryRoadmapOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    icon_slug: Optional[str] = None
    grade_level: int
    regional_board: str
    topics: List[TopicRoadmapOut]

    model_config = ConfigDict(from_attributes=True)


class ExamSubmitResponse(BaseModel):
    score: float
    correct_count: int
    wrong_count: int
    points_earned: int
    xp_earned: int = 0
    stars_awarded: int = 0
    attempt_id: int
    questions: List[QuestionFullOut]

    model_config = ConfigDict(from_attributes=True)


class ProfileUpdate(BaseModel):
    selected_region: str
    grade_level: int


class MockExamSubmit(BaseModel):
    answers: List[AnswerSubmit]
    time_spent_seconds: int


# ─────────────────────────────────────────────────────────────────────────────
# TEACHER PORTAL SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class TeacherCreate(BaseModel):
    phone_number: str = Field(..., description="Teacher phone number")
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6)
    subject: Optional[str] = None
    school: Optional[str] = None
    bio: Optional[str] = None
    profile_photo_url: Optional[str] = None
    teacher_package_scope: str = Field(default="academic", pattern="^(academic|primary|middle|secondary)$")

class TeacherUpdate(BaseModel):
    full_name: Optional[str] = None
    subject: Optional[str] = None
    school: Optional[str] = None
    bio: Optional[str] = None
    profile_photo_url: Optional[str] = None
    teacher_package_scope: Optional[str] = Field(default=None, pattern="^(academic|primary|middle|secondary)$")
    password: Optional[str] = None

class TeacherOut(BaseModel):
    id: int
    phone_number: str
    full_name: str
    role: str
    is_active: bool
    subject: Optional[str]
    school: Optional[str]
    bio: Optional[str]
    profile_photo_url: Optional[str]
    teacher_package_scope: str = "academic"
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class TeacherVideoCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    subject: str = Field(..., max_length=100)
    grade_level: int = Field(..., ge=1, le=12)
    video_type: str = Field(default="link", description="'link' or 'upload'")
    video_url: str = Field(..., max_length=500)
    thumbnail_url: Optional[str] = Field(None, max_length=500)
    duration_minutes: int = 0
    is_published: bool = True

class TeacherVideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[int] = None
    video_type: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    is_published: Optional[bool] = None

class TeacherVideoOut(BaseModel):
    id: int
    teacher_id: int
    title: str
    description: Optional[str]
    subject: str
    grade_level: int
    video_type: str
    video_url: str
    thumbnail_url: Optional[str]
    duration_minutes: int
    is_published: bool
    created_at: datetime.datetime
    view_count: int

    model_config = ConfigDict(from_attributes=True)

class TeacherExamQuestionCreate(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str = Field(..., pattern="^[A-D]$")
    explanation: Optional[str] = None
    order_index: int = 0

class TeacherExamQuestionOut(BaseModel):
    id: int
    exam_id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    explanation: Optional[str]
    order_index: int

    model_config = ConfigDict(from_attributes=True)


class TeacherExamMaterialOut(BaseModel):
    id: int
    exam_id: int
    title: str
    original_filename: str
    content_type: str
    size_bytes: int
    download_url: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class TeacherExamCreate(BaseModel):
    title: str = Field(..., max_length=200)
    subject: str = Field(..., max_length=100)
    grade_level: int = Field(..., ge=1, le=12)
    exam_type: str = Field(default="test", pattern="^(quiz|test|midterm|final|homework)$")
    instructions: Optional[str] = None
    duration_minutes: int = 60
    is_open: bool = True
    allow_review: bool = True
    start_time: Optional[datetime.datetime] = None
    end_time: Optional[datetime.datetime] = None
    questions: List[TeacherExamQuestionCreate] = []

class TeacherExamUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[int] = None
    exam_type: Optional[str] = Field(default=None, pattern="^(quiz|test|midterm|final|homework)$")
    instructions: Optional[str] = None
    duration_minutes: Optional[int] = None
    is_open: Optional[bool] = None
    allow_review: Optional[bool] = None
    start_time: Optional[datetime.datetime] = None
    end_time: Optional[datetime.datetime] = None

class TeacherExamOut(BaseModel):
    id: int
    teacher_id: int
    title: str
    subject: str
    grade_level: int
    exam_type: str = "test"
    instructions: Optional[str]
    duration_minutes: int
    is_open: bool
    allow_review: bool
    start_time: Optional[datetime.datetime]
    end_time: Optional[datetime.datetime]
    created_at: datetime.datetime
    updated_at: datetime.datetime
    questions: List[TeacherExamQuestionOut] = []
    materials: List[TeacherExamMaterialOut] = []

    model_config = ConfigDict(from_attributes=True)

class TeacherExamAttemptSubmit(BaseModel):
    answers: dict = Field(..., description="Mapping of question_id (as str) to answer option ('A'-'D')")
    time_spent_seconds: int = 0

class TeacherExamAttemptOut(BaseModel):
    id: int
    exam_id: int
    student_id: int
    started_at: datetime.datetime
    submitted_at: Optional[datetime.datetime]
    score: Optional[float]
    answers: Optional[dict]
    time_spent_seconds: int
    student_name: Optional[str] = None
    exam_title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ── Teacher LMS: courses / chapters / lessons ────────────────────────────────

class CourseLessonCreate(BaseModel):
    title: str = Field(..., max_length=200)
    lesson_type: str = Field(default="video", pattern="^(video|material|quiz|assignment)$")
    video_id: Optional[int] = None
    exam_id: Optional[int] = None
    content_url: Optional[str] = Field(default=None, max_length=500)
    content_text: Optional[str] = None
    duration_minutes: int = Field(default=0, ge=0)
    sort_order: int = 0

class CourseLessonUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    lesson_type: Optional[str] = Field(default=None, pattern="^(video|material|quiz|assignment)$")
    video_id: Optional[int] = None
    exam_id: Optional[int] = None
    content_url: Optional[str] = Field(default=None, max_length=500)
    content_text: Optional[str] = None
    duration_minutes: Optional[int] = Field(default=None, ge=0)
    sort_order: Optional[int] = None

class CourseLessonOut(BaseModel):
    id: int
    chapter_id: int
    title: str
    lesson_type: str
    video_id: Optional[int]
    exam_id: Optional[int]
    content_url: Optional[str]
    content_text: Optional[str]
    original_filename: Optional[str]
    content_type: Optional[str]
    size_bytes: Optional[int]
    duration_minutes: int
    sort_order: int
    file_download_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class CourseChapterCreate(BaseModel):
    title: str = Field(..., max_length=200)
    sort_order: int = 0

class CourseChapterOut(BaseModel):
    id: int
    course_id: int
    title: str
    sort_order: int
    lessons: List[CourseLessonOut] = []

    model_config = ConfigDict(from_attributes=True)

class TeacherCourseCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    subject: str = Field(..., max_length=100)
    grade_level: int = Field(..., ge=1, le=12)
    is_published: bool = False
    sort_order: int = 100

class TeacherCourseUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = None
    subject: Optional[str] = Field(default=None, max_length=100)
    grade_level: Optional[int] = Field(default=None, ge=1, le=12)
    is_published: Optional[bool] = None
    sort_order: Optional[int] = None

class TeacherCourseOut(BaseModel):
    id: int
    teacher_id: int
    title: str
    description: Optional[str]
    subject: str
    grade_level: int
    is_published: bool
    sort_order: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    chapters: List[CourseChapterOut] = []
    teacher_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class TeacherAnalyticsOut(BaseModel):
    total_courses: int
    published_courses: int
    total_videos: int
    total_exams: int
    open_exams: int
    total_attempts: int
    submitted_attempts: int
    average_score: float
    students_reached: int
    exams_breakdown: List[dict] = []
    recent_attempts: List[TeacherExamAttemptOut] = []

class TeacherStudentOut(BaseModel):
    id: int
    full_name: str
    phone_number: str
    grade_level: int
    package_type: Optional[str]
    package_active: bool
    attempts_count: int
    average_score: Optional[float]
    last_activity: Optional[datetime.datetime]


class ChatRoomCreate(BaseModel):
    name: str = Field(..., max_length=100)
    type: str = Field(default="group", description="'group' or 'direct'")
    members: List[int] = []  # list of user ids to invite


class ChatRoomOut(BaseModel):
    id: int
    name: str
    type: str
    grade_min: Optional[int] = None
    grade_max: Optional[int] = None
    subject: Optional[str] = None
    created_at: datetime.datetime
    created_by_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class ChatMessageCreate(BaseModel):
    content: str
    image_url: Optional[str] = None


class ChatMessageOut(BaseModel):
    id: int
    room_id: int
    sender_id: int
    sender_name: str
    sender_role: str
    content: str
    image_url: Optional[str]
    created_at: datetime.datetime
    is_reported: bool
    is_moderated: bool

    model_config = ConfigDict(from_attributes=True)


class CommunityUserSearchOut(BaseModel):
    id: int
    full_name: str
    phone_number: str
    role: str
    grade_level: int

    model_config = ConfigDict(from_attributes=True)


class DirectMessageCreate(BaseModel):
    receiver_id: int
    content: str = ""
    image_url: Optional[str] = None


class DirectMessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    sender_name: str
    receiver_name: str
    content: str
    image_url: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class CommunityMediaUploadOut(BaseModel):
    file_key: str
    media_url: str
    content_type: str
    size_bytes: int


class CommunityQuestionReplyCreate(BaseModel):
    content: str


class CommunityQuestionReplyOut(BaseModel):
    id: int
    question_id: int
    user_id: int
    user_name: str
    content: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class CommunityQuestionCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: str
    image_url: Optional[str] = None
    subject: str = Field(..., max_length=100)
    grade_level: int = Field(..., ge=1, le=12)


class CommunityQuestionOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    title: str
    description: str
    image_url: Optional[str]
    subject: str
    grade_level: int
    created_at: datetime.datetime
    is_solved: bool
    ai_hint: Optional[str]
    ai_solution: Optional[str]
    ai_similar_question: Optional[str]
    replies: List[CommunityQuestionReplyOut] = []

    model_config = ConfigDict(from_attributes=True)


class AskAiRequest(BaseModel):
    action: str = Field(..., description="'hint', 'solution', or 'similar'")


class LeaderboardEntry(BaseModel):
    user_id: int
    full_name: str
    grade_level: int
    package_type: Optional[str]
    total_xp_points: int
    current_streak: int


class LeaderboardOut(BaseModel):
    rankings: List[LeaderboardEntry]


class DailyMissionOut(BaseModel):
    id: int
    title: str
    type: str
    points_reward: int
    target_count: int
    current_count: int
    is_completed: bool


class StudentBadgeOut(BaseModel):
    id: int
    user_id: int
    badge_type: str
    title: str
    description: str
    awarded_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class StudentProfileStatsOut(BaseModel):
    user_id: int
    full_name: str
    grade_level: int
    package_type: Optional[str]
    total_xp_points: int
    current_streak: int
    badges: List[StudentBadgeOut] = []
    completed_lessons_count: int = 0
    solved_quizzes_count: int = 0


class ModerationReportOut(BaseModel):
    id: int
    message_id: int
    message_sender_id: Optional[int] = None
    message_content: str
    message_sender_name: str
    reported_by_name: str
    reason: str
    created_at: datetime.datetime
    status: str

    model_config = ConfigDict(from_attributes=True)


class ModerationActionRequest(BaseModel):
    action: str = Field(..., description="'delete_message', 'mute_user', 'ban_user', or 'dismiss'")
    mute_hours: int = Field(default=24, ge=1, le=168)


class BlockedWordCreate(BaseModel):
    word: str = Field(..., min_length=2, max_length=100)
    language: Optional[str] = Field(default=None, max_length=20)


class BlockedWordOut(BaseModel):
    id: int
    word: str
    language: Optional[str] = None
    is_active: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentAccountCreate(BaseModel):
    method_type: str = Field(..., description="'evc_plus', 'zaad', 'sahal', 'edahab', 'bank_transfer', 'card'")
    account_name: str = Field(..., max_length=100)
    receiving_number: str = Field(..., max_length=100)
    currency: str = Field("USD", max_length=10)
    instructions: str
    is_recommended: bool = False
    min_amount: float = 0.0
    max_amount: float = 1000.0
    user_notes: Optional[str] = None
    
    # API fields
    mode: str = "manual"  # 'api', 'manual'
    api_provider: Optional[str] = None
    merchant_id: Optional[str] = None
    api_user_id: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    webhook_url: Optional[str] = None
    api_status: str = "disabled"


class PaymentAccountUpdate(BaseModel):
    account_name: Optional[str] = None
    receiving_number: Optional[str] = None
    currency: Optional[str] = None
    instructions: Optional[str] = None
    is_recommended: Optional[bool] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    user_notes: Optional[str] = None
    is_active: Optional[bool] = None
    
    # API fields
    mode: Optional[str] = None
    api_provider: Optional[str] = None
    merchant_id: Optional[str] = None
    api_user_id: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    webhook_url: Optional[str] = None
    api_status: Optional[str] = None


class PaymentAccountOut(BaseModel):
    id: int
    method_type: str
    account_name: str
    receiving_number: str
    currency: str
    is_active: bool
    instructions: str
    is_recommended: bool
    min_amount: float
    max_amount: float
    user_notes: Optional[str] = None
    
    # API fields
    mode: str
    api_provider: Optional[str] = None
    merchant_id: Optional[str] = None
    api_user_id: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    webhook_url: Optional[str] = None
    api_status: str

    model_config = ConfigDict(from_attributes=True)


class PaymentMethodPublicOut(BaseModel):
    """
    Student-facing view of a payment method. Intentionally EXCLUDES all secret
    credentials (merchant_id, api_user_id, api_key, api_secret, webhook_url) so
    they are never sent to the browser. Use PaymentAccountOut for admin endpoints.
    """
    id: int
    method_type: str
    account_name: str
    receiving_number: str
    currency: str
    is_active: bool
    instructions: str
    is_recommended: bool
    min_amount: float
    max_amount: float
    user_notes: Optional[str] = None
    mode: str
    api_provider: Optional[str] = None
    api_status: str

    model_config = ConfigDict(from_attributes=True)


class PaymentSubmissionCreate(BaseModel):
    package_id: str
    package_name: str
    package_price: float
    package_duration_months: int
    payment_method: str
    admin_receiving_account: str
    sender_phone: str
    amount_paid: float
    currency: str = "USD"
    transaction_id: str
    screenshot_url: Optional[str] = ""


class PaymentSubmissionOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    package_id: str
    package_name: str
    package_price: float
    package_duration_months: int
    payment_method: str
    admin_receiving_account: str
    sender_phone: str
    payment_account_id: Optional[int] = None
    merchant_phone: Optional[str] = None
    payer_phone: Optional[str] = None
    amount_paid: float
    currency: str
    transaction_id: str
    screenshot_url: Optional[str] = None
    status: str
    transaction_status: str = "pending"
    admin_note: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime.datetime
    approved_at: Optional[datetime.datetime] = None
    approved_by_id: Optional[int] = None
    is_suspicious: bool = False

    model_config = ConfigDict(from_attributes=True)


class PaymentSubmitApiRequest(BaseModel):
    package_id: str
    package_name: str
    package_price: float
    package_duration_months: int
    payment_method: str
    sender_phone: str
    admin_receiving_account: str
    payment_account_id: Optional[int] = None
    currency: str = "USD"


class PaymentSubmissionResolve(BaseModel):
    action: str = Field(..., description="'approve', 'reject', 'under_review', 'duplicate'")
    admin_note: Optional[str] = None
    rejection_reason: Optional[str] = None


class ReceiptUploadOut(BaseModel):
    file_key: str = Field(..., description="Opaque stored receipt reference to send back with submit-manual")
    content_type: str


class WebhookEventOut(BaseModel):
    id: int
    provider: str
    event_id: str
    transaction_id: Optional[str] = None
    signature_valid: bool
    status: str
    processed: bool
    amount: Optional[float] = None
    currency: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class SystemHealthCheck(BaseModel):
    key: str
    label: str
    value: str
    status: str  # 'safe' | 'warning' | 'critical' | 'info'
    detail: Optional[str] = None


class SystemHealthOut(BaseModel):
    overall: str  # 'safe' | 'warning' | 'critical'
    generated_at: datetime.datetime
    checks: List[SystemHealthCheck]


class AdminActionLogOut(BaseModel):
    id: int
    admin_id: Optional[int] = None
    admin_name: Optional[str] = None
    action_type: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
