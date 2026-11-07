import datetime
from typing import List, Optional
from sqlalchemy import ForeignKey, String, Text, Boolean, DateTime, Integer, Float, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym
from app.database import Base


class User(Base):
    """
    SQLAlchemy model representing a User (Student, Teacher, or Admin).
    Includes gamification fields: XP points and streak tracking.
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    phone_number: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(20), default="student", nullable=False
    )  # 'student', 'teacher', 'admin'
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    admin_session_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Rotated on every login: only the most recent device's token stays valid,
    # so one paid account cannot be shared by a whole classroom.
    session_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    password_changed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    muted_until: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    
    # SomPrep learning profile fields.
    selected_region: Mapped[str] = mapped_column(String(50), default="Federal", nullable=False) # 'Federal', 'Puntland', 'Somaliland'
    grade_level: Mapped[int] = mapped_column(Integer, default=12, nullable=False) # 1 to 12
    education_level: Mapped[str] = mapped_column(String(50), default="Secondary", nullable=False) # 'Primary', 'Middle', 'Secondary'
    learning_goal: Mapped[str] = mapped_column(String(100), default="Daily Learning", nullable=False)
    learner_type: Mapped[str] = mapped_column(String(50), default="school_student", nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_xp_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Package-based subscription fields
    package_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    package_access_scope: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    package_paid_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    package_expires_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)

    @property
    def package_active(self) -> bool:
        if not self.package_expires_at:
            return False
        return self.package_expires_at > datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

    # Teacher specific fields
    subject: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    school: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    profile_photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    teacher_package_scope: Mapped[str] = mapped_column(String(50), default="academic", nullable=False)

    # Relationships
    exam_attempts: Mapped[List["ExamAttempt"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    subscription: Mapped[Optional["UserSubscription"]] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    progress_records: Mapped[List["StudentProgress"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    coach_logs: Mapped[List["AICoachLog"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    video_watch_logs: Mapped[List["VideoWatchLog"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class UserSubscription(Base):
    """
    SQLAlchemy model representing a Student's subscription status.
    Handles the 12-month Hormuud EVC Plus access model ($2.50 USD).
    """
    __tablename__ = "user_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default="inactive", nullable=False
    )  # 'active', 'expired', 'inactive'
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    transaction_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    activated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    price_paid: Mapped[float] = mapped_column(Float, default=2.50, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="subscription")


class PaymentRequest(Base):
    """
    SQLAlchemy model representing a single EVC Plus payment request (transaction log).

    This is intentionally separate from UserSubscription. Creating a PaymentRequest
    NEVER activates a subscription. The lifecycle is:
        pending   -> request created and pushed to the EVC Plus gateway
        confirmed -> payment verified (admin/webhook) -> subscription is then activated
        failed    -> gateway rejected the request or it could not be initiated
    """
    __tablename__ = "payment_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    package_id: Mapped[str] = mapped_column(String(50), nullable=False)
    billing_cycle: Mapped[str] = mapped_column(String(20), nullable=False)  # 'annual', 'monthly'
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    evc_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    transaction_id: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )  # 'pending', 'confirmed', 'failed'
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )


class Category(Base):
    """
    SQLAlchemy model representing a subject category (e.g., Mathematics, Physics).
    Drives the Regional toggle and school level curriculum filtering.
    """
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon_slug: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # ── Somali school curriculum properties ────────────────────────────────────
    grade_level: Mapped[int] = mapped_column(Integer, default=12, nullable=False) # 1-12
    regional_board: Mapped[str] = mapped_column(String(50), default="Federal", nullable=False) # 'Federal', 'Puntland', 'Somaliland', or 'All'

    # Relationships
    topics: Mapped[List["Topic"]] = relationship(
        back_populates="category", cascade="all, delete-orphan"
    )
    subtopics: Mapped[List["SubTopic"]] = relationship(
        back_populates="category", cascade="all, delete-orphan"
    )


class Topic(Base):
    """
    SQLAlchemy model representing a Topic group (folder) containing multiple SubTopics.
    Example: Math Category -> "Algebra" Topic -> "Linear Equations" SubTopic.
    """
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    category: Mapped["Category"] = relationship(back_populates="topics")
    subtopics: Mapped[List["SubTopic"]] = relationship(
        back_populates="topic", cascade="all, delete-orphan"
    )


class SubTopic(Base):
    """
    SQLAlchemy model representing a conceptual topic node on the Konu Ağacı roadmap.
    Includes a self-referential prerequisite FK for lock-step progression enforcement.
    """
    __tablename__ = "subtopics"

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    topic_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    icon_slug: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # Self-referential FK: must complete this subtopic before current one is unlocked
    prerequisite_subtopic_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subtopics.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    category: Mapped["Category"] = relationship(back_populates="subtopics")
    topic: Mapped[Optional["Topic"]] = relationship(back_populates="subtopics")
    
    video_lessons: Mapped[List["VideoLesson"]] = relationship(
        back_populates="subtopic", cascade="all, delete-orphan"
    )
    questions: Mapped[List["Question"]] = relationship(
        back_populates="subtopic", cascade="all, delete-orphan"
    )
    exam_attempts: Mapped[List["ExamAttempt"]] = relationship(
        back_populates="subtopic", cascade="all, delete-orphan"
    )
    progress_records: Mapped[List["StudentProgress"]] = relationship(
        back_populates="subtopic", cascade="all, delete-orphan"
    )
    prerequisite: Mapped[Optional["SubTopic"]] = relationship(
        "SubTopic", foreign_keys=[prerequisite_subtopic_id], remote_side="SubTopic.id"
    )


class VideoLesson(Base):
    """
    SQLAlchemy model representing a Video Lecture recorded by Somali teachers.
    Housed under a specific SubTopic concept node.
    """
    __tablename__ = "video_lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    subtopic_id: Mapped[int] = mapped_column(
        ForeignKey("subtopics.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    video_url: Mapped[str] = mapped_column(String(500), nullable=False) # Vimeo/HLS URL
    duration: Mapped[int] = mapped_column(Integer, default=0, nullable=False) # In seconds
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    subtopic: Mapped["SubTopic"] = relationship(back_populates="video_lessons")
    watch_logs: Mapped[List["VideoWatchLog"]] = relationship(
        back_populates="video", cascade="all, delete-orphan"
    )


class VideoWatchLog(Base):
    """
    SQLAlchemy model tracking progress on how much of a VideoLesson the student has watched.
    Completion (>= 90%) unlocks subsequent roadmap gates.
    """
    __tablename__ = "video_watch_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    video_id: Mapped[int] = mapped_column(
        ForeignKey("video_lessons.id", ondelete="CASCADE"), nullable=False
    )
    watched_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="video_watch_logs")
    video: Mapped["VideoLesson"] = relationship(back_populates="watch_logs")


class MockExam(Base):
    """
    SQLAlchemy model representing a smart full trial exam (Deneme Sınavı).
    """
    __tablename__ = "mock_exams"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    regional_board: Mapped[str] = mapped_column(String(50), default="Federal", nullable=False) # 'Federal', 'Puntland', 'Somaliland'
    grade_level: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=120, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )

    # Relationships
    questions: Mapped[List["Question"]] = relationship(
        back_populates="mock_exam", cascade="all, delete-orphan"
    )


class Question(Base):
    """
    SQLAlchemy model representing an Exam Question linked to a SubTopic or MockExam.
    Includes SomPrep reflex step titles for diagnostic review breakdowns.
    """
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    subtopic_id: Mapped[int] = mapped_column(
        ForeignKey("subtopics.id", ondelete="CASCADE"), nullable=False
    )
    mock_exam_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("mock_exams.id", ondelete="SET NULL"), nullable=True
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    explanation_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    explanation_video_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    difficulty_level: Mapped[str] = mapped_column(
        String(20), default="medium", nullable=False
    )  # 'easy', 'medium', 'hard'
    # Reflex-based diagnosis metadata.
    reflex_step_title: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    # ── Metadata & Workflow status for Institutional Question Bank ────────────
    language: Mapped[str] = mapped_column(String(10), default="so", nullable=False) # 'en', 'so', 'ar'
    source_type: Mapped[str] = mapped_column(String(50), default="teacher_drafted", nullable=False) # exam_style_original, past_paper_inspired, teacher_drafted, ai_assisted_draft, reviewer_approved_original
    review_status: Mapped[str] = mapped_column("reviewer_status", String(20), default="approved", nullable=False) # 'draft', 'pending_review', 'approved', 'rejected'
    reviewer_status = synonym("review_status")
    reviewer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    subtopic: Mapped["SubTopic"] = relationship(back_populates="questions")
    mock_exam: Mapped[Optional["MockExam"]] = relationship(back_populates="questions")
    reviewer: Mapped[Optional["User"]] = relationship(foreign_keys=[reviewer_id])
    choices: Mapped[List["Choice"]] = relationship(
        back_populates="question", cascade="all, delete-orphan"
    )

    @property
    def category(self):
        return self.subtopic.category if self.subtopic else None


class Choice(Base):
    """
    SQLAlchemy model representing a multiple choice option for a Question.
    """
    __tablename__ = "choices"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    choice_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    # Relationships
    question: Mapped["Question"] = relationship(back_populates="choices")


class ExamAttempt(Base):
    """
    SQLAlchemy model representing a Student's attempt at an exam.
    Supports both subtopic-level practice and full mock examinations.
    """
    __tablename__ = "exam_attempts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    subtopic_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subtopics.id", ondelete="CASCADE"), nullable=True
    )
    mock_exam_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("mock_exams.id", ondelete="CASCADE"), nullable=True
    )
    score: Mapped[float] = mapped_column(Float, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    correct_answers: Mapped[int] = mapped_column(Integer, nullable=False)
    wrong_answers: Mapped[int] = mapped_column(Integer, nullable=False)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    ai_insight: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="exam_attempts")
    subtopic: Mapped[Optional["SubTopic"]] = relationship(back_populates="exam_attempts")
    mock_exam: Mapped[Optional["MockExam"]] = relationship()

    @property
    def category(self):
        return self.subtopic.category if self.subtopic else None

    @property
    def category_id(self):
        return self.subtopic.category_id if self.subtopic else None


class StudentProgress(Base):
    """
    SQLAlchemy model representing a student's gamified progress on the Konu Ağacı roadmap.
    Stars follow the SomPrep mastery model: 1=70-79%, 2=80-89%, 3=90-100%.
    """
    __tablename__ = "student_progress"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    subtopic_id: Mapped[int] = mapped_column(
        ForeignKey("subtopics.id", ondelete="CASCADE"), nullable=False
    )
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    points_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # SomPrep star rating (1-3).
    stars_awarded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unlocked_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="progress_records")
    subtopic: Mapped["SubTopic"] = relationship(back_populates="progress_records")


class AICoachLog(Base):
    """
    SQLAlchemy model representing Coach Refik's personalized feedback log.
    mood_type drives UI avatar expression and color theming on the dashboard.
    """
    __tablename__ = "ai_coach_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    coach_message: Mapped[str] = mapped_column(Text, nullable=False)
    suggestion_type: Mapped[str] = mapped_column(
        String(50), default="focus_needed", nullable=False
    )  # 'focus_needed', 'motivational', 'excellent_progress'
    # ── Mood type drives dashboard avatar + color theming ──────────────────────
    mood_type: Mapped[str] = mapped_column(
        String(50), default="motivational", nullable=False
    )  # 'motivational', 'strict_warning', 'celebration'
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="coach_logs")


class EducationLevel(Base):
    __tablename__ = "education_levels"
    id: Mapped[int] = mapped_column(primary_key=True)
    name_en: Mapped[str] = mapped_column(String(100), nullable=False)
    name_so: Mapped[str] = mapped_column(String(100), nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Grade(Base):
    __tablename__ = "grades"
    id: Mapped[int] = mapped_column(primary_key=True)
    level_id: Mapped[int] = mapped_column(ForeignKey("education_levels.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class RegionOrExamTrack(Base):
    __tablename__ = "region_or_exam_tracks"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(50), default="federal", nullable=False) # federal/state/school/custom


class Subject(Base):
    __tablename__ = "subjects"
    id: Mapped[int] = mapped_column(primary_key=True)
    grade_id: Mapped[int] = mapped_column(ForeignKey("grades.id", ondelete="CASCADE"), nullable=False)
    name_en: Mapped[str] = mapped_column(String(100), nullable=False)
    name_so: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Unit(Base):
    __tablename__ = "units"
    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class ExamBlueprint(Base):
    __tablename__ = "exam_blueprints"
    id: Mapped[int] = mapped_column(primary_key=True)
    grade_id: Mapped[int] = mapped_column(Integer, nullable=False)
    subject_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    exam_type: Mapped[str] = mapped_column(String(50), default="full_mock", nullable=False) # full_mock/subject_mock/topic_test/weakness_test
    duration_minutes: Mapped[int] = mapped_column(Integer, default=120, nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    difficulty_distribution: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON string
    topic_distribution: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON string


class AnswerRecord(Base):
    __tablename__ = "answer_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    attempt_id: Mapped[int] = mapped_column(ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    selected_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # choice text or choice_id
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class WeaknessReport(Base):
    __tablename__ = "weakness_reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    attempt_id: Mapped[int] = mapped_column(ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False)
    weak_subjects: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON string
    weak_topics: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON string
    recommendations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    readiness_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)


class StudyPlan(Base):
    __tablename__ = "study_plans"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    week_start: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    tasks: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON string
    completion_status: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON string


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    display_title: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    category: Mapped[str] = mapped_column(String(50), default="academic", nullable=False)
    audience: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    target: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    grade_range: Mapped[str] = mapped_column(String(50), nullable=False)
    access_scope: Mapped[str] = mapped_column(String(50), default="academic", nullable=False)
    price: Mapped[float] = mapped_column(Float, default=2.50, nullable=False)
    monthly_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    duration_months: Mapped[int] = mapped_column(Integer, default=12, nullable=False)
    features: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    button_label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    details_path: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=100, nullable=False)


class Voucher(Base):
    __tablename__ = "vouchers"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    plan_id: Mapped[int] = mapped_column(Integer, nullable=False)
    school_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    student_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False) # active/used/expired


class School(Base):
    __tablename__ = "schools"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    region: Mapped[str] = mapped_column(String(100), nullable=False)


class Classroom(Base):
    __tablename__ = "classrooms"
    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    grade_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)


class TeacherAssignment(Base):
    __tablename__ = "teacher_assignments"
    id: Mapped[int] = mapped_column(primary_key=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)


# ─────────────────────────────────────────────────────────────────────────────
# TECHNOLOGY SKILLS TRACKS
# Dedicated structure for professional/tech courses (Office Skills, Programming,
# Data Analysis, ...). Intentionally separate from the Grade 8/12 high-school
# Category/SubTopic/Question hierarchy. All types are PostgreSQL-compatible.
# ─────────────────────────────────────────────────────────────────────────────

class TechTrack(Base):
    """A technology skill track (e.g. 'office-skills', 'programming-skills')."""
    __tablename__ = "tech_tracks"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    icon: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )

    lessons: Mapped[List["TechLesson"]] = relationship(
        back_populates="track", cascade="all, delete-orphan",
        order_by="TechLesson.order_index"
    )
    enrollments: Mapped[List["TechEnrollment"]] = relationship(
        back_populates="track", cascade="all, delete-orphan"
    )


class TechLesson(Base):
    """A single lesson inside a tech track."""
    __tablename__ = "tech_lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    track_id: Mapped[int] = mapped_column(
        ForeignKey("tech_tracks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    content_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'video', 'text', 'quiz'
    content_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    track: Mapped["TechTrack"] = relationship(back_populates="lessons")
    quiz_attempts: Mapped[List["TechQuizAttempt"]] = relationship(
        back_populates="lesson", cascade="all, delete-orphan"
    )


class TechEnrollment(Base):
    """A user's enrollment in a tech track."""
    __tablename__ = "tech_enrollments"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    track_id: Mapped[int] = mapped_column(
        ForeignKey("tech_tracks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    enrolled_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    completed_lessons: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    progress_percent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    completed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)

    track: Mapped["TechTrack"] = relationship(back_populates="enrollments")


class TechQuizAttempt(Base):
    """A user's quiz attempt history."""
    __tablename__ = "tech_quiz_attempts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    lesson_id: Mapped[int] = mapped_column(
        ForeignKey("tech_lessons.id", ondelete="CASCADE"), index=True, nullable=False
    )
    score: Mapped[float] = mapped_column(Float, nullable=False)
    answers: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    attempted_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )

    lesson: Mapped["TechLesson"] = relationship(back_populates="quiz_attempts")


# ─────────────────────────────────────────────────────────────────────────────
# TEACHER PORTAL MODELS
# ─────────────────────────────────────────────────────────────────────────────

class TeacherVideo(Base):
    __tablename__ = "teacher_videos"

    id: Mapped[int] = mapped_column(primary_key=True)
    teacher_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subject: Mapped[str] = mapped_column(String(100), nullable=False)
    grade_level: Mapped[int] = mapped_column(Integer, nullable=False)
    video_type: Mapped[str] = mapped_column(String(50), default="link", nullable=False) # 'link' or 'upload'
    video_url: Mapped[str] = mapped_column(String(500), nullable=False)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    teacher: Mapped["User"] = relationship()


class TeacherExam(Base):
    __tablename__ = "teacher_exams"

    id: Mapped[int] = mapped_column(primary_key=True)
    teacher_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    subject: Mapped[str] = mapped_column(String(100), nullable=False)
    grade_level: Mapped[int] = mapped_column(Integer, nullable=False)
    # quiz / test / midterm / final / homework
    exam_type: Mapped[str] = mapped_column(String(30), default="test", nullable=False)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    is_open: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_review: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    start_time: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    end_time: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    teacher: Mapped["User"] = relationship()
    questions: Mapped[List["TeacherExamQuestion"]] = relationship(
        back_populates="exam", cascade="all, delete-orphan",
        order_by="TeacherExamQuestion.order_index"
    )
    attempts: Mapped[List["TeacherExamAttempt"]] = relationship(
        back_populates="exam", cascade="all, delete-orphan"
    )
    materials: Mapped[List["TeacherExamMaterial"]] = relationship(
        back_populates="exam", cascade="all, delete-orphan",
        order_by="TeacherExamMaterial.created_at"
    )


class TeacherExamQuestion(Base):
    __tablename__ = "teacher_exam_questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    exam_id: Mapped[int] = mapped_column(
        ForeignKey("teacher_exams.id", ondelete="CASCADE"), index=True, nullable=False
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    option_a: Mapped[str] = mapped_column(Text, nullable=False)
    option_b: Mapped[str] = mapped_column(Text, nullable=False)
    option_c: Mapped[str] = mapped_column(Text, nullable=False)
    option_d: Mapped[str] = mapped_column(Text, nullable=False)
    correct_answer: Mapped[str] = mapped_column(String(1), nullable=False) # 'A', 'B', 'C', 'D'
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    exam: Mapped["TeacherExam"] = relationship(back_populates="questions")


class TeacherExamAttempt(Base):
    __tablename__ = "teacher_exam_attempts"

    id: Mapped[int] = mapped_column(primary_key=True)
    exam_id: Mapped[int] = mapped_column(
        ForeignKey("teacher_exams.id", ondelete="CASCADE"), index=True, nullable=False
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    started_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    submitted_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    answers: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True) # e.g. {"1": "A", "2": "C"}
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    exam: Mapped["TeacherExam"] = relationship(back_populates="attempts")
    student: Mapped["User"] = relationship()


class TeacherExamMaterial(Base):
    __tablename__ = "teacher_exam_materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    exam_id: Mapped[int] = mapped_column(
        ForeignKey("teacher_exams.id", ondelete="CASCADE"), index=True, nullable=False
    )
    uploaded_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    file_key: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    exam: Mapped["TeacherExam"] = relationship(back_populates="materials")
    uploaded_by: Mapped["User"] = relationship(foreign_keys=[uploaded_by_id])

    @property
    def download_url(self) -> str:
        return f"/api/exams/teacher-exams/materials/{self.id}/download"


class TeacherCourse(Base):
    """A structured course a teacher builds from chapters and lessons (LMS)."""
    __tablename__ = "teacher_courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    teacher_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subject: Mapped[str] = mapped_column(String(100), nullable=False)
    grade_level: Mapped[int] = mapped_column(Integer, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    teacher: Mapped["User"] = relationship()
    chapters: Mapped[List["CourseChapter"]] = relationship(
        back_populates="course", cascade="all, delete-orphan",
        order_by="CourseChapter.sort_order, CourseChapter.id",
    )


class CourseChapter(Base):
    __tablename__ = "course_chapters"

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("teacher_courses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    course: Mapped["TeacherCourse"] = relationship(back_populates="chapters")
    lessons: Mapped[List["CourseLesson"]] = relationship(
        back_populates="chapter", cascade="all, delete-orphan",
        order_by="CourseLesson.sort_order, CourseLesson.id",
    )


class CourseLesson(Base):
    """
    One unit of course content. lesson_type:
      'video'      — links a TeacherVideo or an external video URL
      'material'   — an uploaded file (PDF/Word/PowerPoint/image) or link
      'quiz'       — links a TeacherExam the student takes in the exam player
      'assignment' — instructions text, optionally with an attached file
    """
    __tablename__ = "course_lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    chapter_id: Mapped[int] = mapped_column(
        ForeignKey("course_chapters.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    lesson_type: Mapped[str] = mapped_column(String(20), default="video", nullable=False)
    video_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("teacher_videos.id", ondelete="SET NULL"), nullable=True
    )
    exam_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("teacher_exams.id", ondelete="SET NULL"), nullable=True
    )
    content_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    content_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Optional single uploaded file (same storage/validation as exam materials)
    file_key: Mapped[Optional[str]] = mapped_column(String(160), unique=True, nullable=True)
    original_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    content_type: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    chapter: Mapped["CourseChapter"] = relationship(back_populates="lessons")
    video: Mapped[Optional["TeacherVideo"]] = relationship()
    exam: Mapped[Optional["TeacherExam"]] = relationship()


class ChatRoom(Base):
    __tablename__ = "chat_rooms"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(20), default="subject", nullable=False)  # 'class', 'subject', 'group', 'direct'
    grade_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    grade_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class ChatRoomMember(Base):
    __tablename__ = "chat_room_members"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("chat_rooms.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    joined_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("chat_rooms.id", ondelete="CASCADE"), index=True, nullable=False)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    is_reported: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_moderated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    room: Mapped["ChatRoom"] = relationship()
    sender: Mapped["User"] = relationship()


class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    sender_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    receiver_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    sender: Mapped["User"] = relationship(foreign_keys=[sender_id])
    receiver: Mapped["User"] = relationship(foreign_keys=[receiver_id])


class CommunityMedia(Base):
    __tablename__ = "community_media"

    id: Mapped[int] = mapped_column(primary_key=True)
    file_key: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    uploaded_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    original_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    uploaded_by: Mapped["User"] = relationship(foreign_keys=[uploaded_by_id])

    @property
    def download_url(self) -> str:
        return f"/api/exams/teacher-exams/materials/{self.id}/download"


class BlockedWord(Base):
    __tablename__ = "blocked_words"

    id: Mapped[int] = mapped_column(primary_key=True)
    word: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    created_by: Mapped[Optional["User"]] = relationship(foreign_keys=[created_by_id])


class CommunityQuestion(Base):
    __tablename__ = "community_questions"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    subject: Mapped[str] = mapped_column(String(100), nullable=False)
    grade_level: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    is_solved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # AI Coach assistance cache
    ai_hint: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_solution: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_similar_question: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship()
    replies: Mapped[List["CommunityQuestionReply"]] = relationship(back_populates="question", cascade="all, delete-orphan")


class CommunityQuestionReply(Base):
    __tablename__ = "community_question_replies"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("community_questions.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    
    question: Mapped["CommunityQuestion"] = relationship(back_populates="replies")
    user: Mapped["User"] = relationship()


class ReportedMessage(Base):
    __tablename__ = "reported_messages"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("chat_messages.id", ondelete="CASCADE"), nullable=False)
    reported_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reason: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # 'pending', 'resolved', 'dismissed'

    message: Mapped["ChatMessage"] = relationship()
    reporter: Mapped["User"] = relationship(foreign_keys=[reported_by_id])


class BlockedUser(Base):
    __tablename__ = "blocked_users"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    blocker_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    blocked_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)


class StudentBadge(Base):
    __tablename__ = "student_badges"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    badge_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'fast_learner', 'helping_hand', 'streak_master'
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    awarded_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)


class PaymentAccount(Base):
    __tablename__ = "payment_accounts"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    method_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'evc_plus', 'zaad', 'sahal', 'edahab', 'bank_transfer', 'card'
    account_name: Mapped[str] = mapped_column(String(100), nullable=False)
    receiving_number: Mapped[str] = mapped_column(String(100), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    instructions: Mapped[str] = mapped_column(Text, nullable=False)
    is_recommended: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    min_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    max_amount: Mapped[float] = mapped_column(Float, default=1000.0, nullable=False)
    user_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # API fields for future integration
    mode: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)  # 'api', 'manual'
    api_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    merchant_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    api_user_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    api_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    api_secret: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    webhook_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    api_status: Mapped[str] = mapped_column(String(20), default="disabled", nullable=False) # 'disabled', 'test', 'live'


class PaymentSubmission(Base):
    __tablename__ = "payment_submissions"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    user_name: Mapped[str] = mapped_column(String(100), nullable=False)
    user_email: Mapped[str] = mapped_column(String(100), nullable=False)
    package_id: Mapped[str] = mapped_column(String(50), nullable=False)
    package_name: Mapped[str] = mapped_column(String(100), nullable=False)
    package_price: Mapped[float] = mapped_column(Float, nullable=False)
    package_duration_months: Mapped[int] = mapped_column(Integer, default=12, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False)
    admin_receiving_account: Mapped[str] = mapped_column(String(100), nullable=False)
    sender_phone: Mapped[str] = mapped_column(String(50), nullable=False)
    payment_account_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("payment_accounts.id", ondelete="SET NULL"), nullable=True
    )
    merchant_phone: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    payer_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    amount_paid: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    transaction_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    screenshot_url: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False) # 'pending', 'under_review', 'approved', 'rejected', 'expired', 'duplicate', 'failed'
    transaction_status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)
    admin_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    approved_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    approved_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    user: Mapped["User"] = relationship(foreign_keys=[user_id])
    approved_by: Mapped[Optional["User"]] = relationship(foreign_keys=[approved_by_id])


def _utcnow_naive() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


class AdminActionLog(Base):
    """
    Audit trail for sensitive admin/teacher actions (payment approvals,
    rejections, account changes, role changes, manual subscription edits).
    Append-only; timestamps stored in naive UTC for SQLite/PostgreSQL parity.
    """
    __tablename__ = "admin_action_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    admin_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    admin_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    action_type: Mapped[str] = mapped_column(String(60), index=True, nullable=False)
    target_type: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    target_id: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    old_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=_utcnow_naive, nullable=False
    )

    admin: Mapped[Optional["User"]] = relationship(foreign_keys=[admin_id])


class AdminPasswordResetOTP(Base):
    """One-time OTP challenge for admin password reset."""
    __tablename__ = "admin_password_reset_otps"

    id: Mapped[int] = mapped_column(primary_key=True)
    admin_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    otp_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    reset_token_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    delivery_channel: Mapped[str] = mapped_column(String(20), default="sms", nullable=False)
    destination_masked: Mapped[str] = mapped_column(String(80), nullable=False)
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    verified_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    used_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=_utcnow_naive, nullable=False)

    admin: Mapped["User"] = relationship(foreign_keys=[admin_id])


class WebhookEvent(Base):
    """
    Append-only log of payment provider webhook callbacks (EVC Plus / WaafiPay /
    Hormuud). Provides idempotency (unique event_id) and an audit trail of every
    callback, whether or not it was accepted. NEVER activates a subscription on
    its own — activation only happens after full verification in the service layer.
    """
    __tablename__ = "webhook_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    provider: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    event_id: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    transaction_id: Mapped[Optional[str]] = mapped_column(String(120), index=True, nullable=True)
    signature_valid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # 'received', 'unverified', 'invalid_signature', 'duplicate', 'rejected', 'processed'
    status: Mapped[str] = mapped_column(String(30), default="received", nullable=False)
    processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    raw_payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=_utcnow_naive, nullable=False
    )
