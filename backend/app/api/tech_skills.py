"""
Technology Skills API — enrollment, lessons/progress, quiz submission, and
completion tracking for the professional tech tracks.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import models
from app import schemas_tech as st
from app.api.auth import get_current_user
from app.database import get_db
from app.utils.access import require_active_subscription, has_active_subscription

router = APIRouter(prefix="/api/tech", tags=["Technology Skills"])

# Access policy for Technology Skills:
#   * Browsing the track list + track detail (titles/structure) is FREE for any
#     logged-in user, so students can preview before paying.
#   * Premium ACTIONS — enrolling, completing lessons, and submitting quizzes —
#     require an active subscription.
#   * Lesson content URLs in track detail are locked (nulled) for non-subscribers
#     so premium learning material is never delivered to the browser for free.

QUIZ_KEYS = {
    ("office-skills", 5): {"1": "A", "2": "B", "3": "C", "4": "D", "5": "A"},
    ("programming-skills", 7): {"1": "B", "2": "C", "3": "A", "4": "D", "5": "B"},
    ("data-analysis", 5): {"1": "C", "2": "A", "3": "D", "4": "B", "5": "C"},
    ("machine-learning", 7): {"1": "D", "2": "B", "3": "C", "4": "A", "5": "D"}
}

@router.get("/tracks", response_model=List[st.TechTrackOut])
def list_tracks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all tracks with progress for current user."""
    tracks = db.query(models.TechTrack).order_by(models.TechTrack.id).all()
    out = []
    for track in tracks:
        enrollment = db.query(models.TechEnrollment).filter(
            models.TechEnrollment.user_id == current_user.id,
            models.TechEnrollment.track_id == track.id
        ).first()
        
        is_enrolled = enrollment is not None
        progress_percent = enrollment.progress_percent if enrollment else 0.0
        
        out.append(
            st.TechTrackOut(
                id=track.id,
                name=track.name,
                slug=track.slug,
                description=track.description,
                icon=track.icon,
                color=track.color,
                created_at=track.created_at,
                is_enrolled=is_enrolled,
                progress_percent=progress_percent
            )
        )
    return out


@router.get("/tracks/{slug}", response_model=st.TechTrackDetailOut)
def track_detail(
    slug: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Single track detail + lessons list with completion status."""
    track = db.query(models.TechTrack).filter(models.TechTrack.slug == slug).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found.")

    enrollment = db.query(models.TechEnrollment).filter(
        models.TechEnrollment.user_id == current_user.id,
        models.TechEnrollment.track_id == track.id
    ).first()

    is_enrolled = enrollment is not None
    progress_percent = enrollment.progress_percent if enrollment else 0.0
    completed_lesson_ids = set(enrollment.completed_lessons or []) if enrollment else set()

    # Premium content gating: only deliver lesson content URLs to subscribers.
    # Non-subscribers still see the lesson structure (titles) for preview.
    can_access_content = has_active_subscription(current_user)

    lessons_out = []
    for lesson in track.lessons:
        lessons_out.append(
            st.TechLessonOut(
                id=lesson.id,
                title=lesson.title,
                order_index=lesson.order_index,
                content_type=lesson.content_type,
                content_url=lesson.content_url if can_access_content else None,
                duration_minutes=lesson.duration_minutes,
                is_completed=lesson.id in completed_lesson_ids
            )
        )

    return st.TechTrackDetailOut(
        id=track.id,
        name=track.name,
        slug=track.slug,
        description=track.description,
        icon=track.icon,
        color=track.color,
        created_at=track.created_at,
        is_enrolled=is_enrolled,
        progress_percent=progress_percent,
        lessons=lessons_out
    )


@router.post("/enroll/{track_id}", response_model=st.TechEnrollmentOut)
def enroll(
    track_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    """Enroll current user in a track. Premium: requires active subscription."""
    track = db.query(models.TechTrack).filter(models.TechTrack.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found.")

    enrollment = db.query(models.TechEnrollment).filter(
        models.TechEnrollment.user_id == current_user.id,
        models.TechEnrollment.track_id == track_id
    ).first()

    if not enrollment:
        enrollment = models.TechEnrollment(
            user_id=current_user.id,
            track_id=track_id,
            completed_lessons=[],
            progress_percent=0.0
        )
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)

    # Attach track info for API response
    enrollment.track_name = track.name
    enrollment.track_slug = track.slug
    return enrollment


@router.get("/my-progress", response_model=List[st.TechEnrollmentOut])
def my_progress(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all enrollments with percent complete."""
    enrollments = db.query(models.TechEnrollment).filter(
        models.TechEnrollment.user_id == current_user.id
    ).all()

    for enrollment in enrollments:
        track = db.query(models.TechTrack).filter(models.TechTrack.id == enrollment.track_id).first()
        if track:
            enrollment.track_name = track.name
            enrollment.track_slug = track.slug
            
    return enrollments


@router.post("/lesson/{lesson_id}/complete", response_model=st.TechEnrollmentOut)
def complete_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    """Mark lesson done, update progress percent. Premium: requires subscription."""
    lesson = db.query(models.TechLesson).filter(models.TechLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found.")

    track = db.query(models.TechTrack).filter(models.TechTrack.id == lesson.track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found.")

    enrollment = db.query(models.TechEnrollment).filter(
        models.TechEnrollment.user_id == current_user.id,
        models.TechEnrollment.track_id == track.id
    ).first()

    if not enrollment:
        raise HTTPException(status_code=403, detail="You are not enrolled in this track.")

    completed = list(enrollment.completed_lessons or [])
    if lesson_id not in completed:
        completed.append(lesson_id)
        enrollment.completed_lessons = completed
        
        total_lessons = db.query(models.TechLesson).filter(models.TechLesson.track_id == track.id).count()
        enrollment.progress_percent = (len(completed) / total_lessons) * 100 if total_lessons > 0 else 0.0
        
        if enrollment.progress_percent >= 100.0:
            enrollment.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
            
        db.add(enrollment)
        
        # Award gamified XP points to the user
        current_user.total_xp_points = (current_user.total_xp_points or 0) + 15
        db.add(current_user)
        
        db.commit()
        db.refresh(enrollment)

    enrollment.track_name = track.name
    enrollment.track_slug = track.slug
    return enrollment


@router.post("/quiz/{lesson_id}", response_model=st.TechQuizResult)
def submit_quiz(
    lesson_id: int,
    payload: st.TechQuizSubmit,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    """Submit quiz answers, return score. Premium: requires active subscription."""
    lesson = db.query(models.TechLesson).filter(models.TechLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found.")

    if lesson.content_type != "quiz":
        raise HTTPException(status_code=400, detail="This lesson is not a quiz.")

    track = db.query(models.TechTrack).filter(models.TechTrack.id == lesson.track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found.")

    # Get correct answers based on track slug and lesson order index
    correct_answers = QUIZ_KEYS.get((track.slug, lesson.order_index), {"1": "A", "2": "B", "3": "C", "4": "D", "5": "A"})
    
    user_answers = payload.answers
    correct_count = 0
    total_count = len(correct_answers)

    for q_id, correct_ans in correct_answers.items():
        user_ans = user_answers.get(str(q_id)) or user_answers.get(int(q_id))
        if user_ans and str(user_ans).upper() == str(correct_ans).upper():
            correct_count += 1

    score = (correct_count / total_count) * 100 if total_count > 0 else 0.0
    passed = score >= 60.0

    # Record the quiz attempt
    attempt = models.TechQuizAttempt(
        user_id=current_user.id,
        lesson_id=lesson_id,
        score=score,
        answers=user_answers
    )
    db.add(attempt)

    progress_percent = 0.0
    
    # If passed, complete the lesson
    if passed:
        enrollment = db.query(models.TechEnrollment).filter(
            models.TechEnrollment.user_id == current_user.id,
            models.TechEnrollment.track_id == track.id
        ).first()
        if enrollment:
            completed = list(enrollment.completed_lessons or [])
            if lesson_id not in completed:
                completed.append(lesson_id)
                enrollment.completed_lessons = completed
                
                total_lessons = db.query(models.TechLesson).filter(models.TechLesson.track_id == track.id).count()
                enrollment.progress_percent = (len(completed) / total_lessons) * 100 if total_lessons > 0 else 0.0
                
                if enrollment.progress_percent >= 100.0:
                    enrollment.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
                    
                db.add(enrollment)
                
                # Award gamified XP points to the user
                current_user.total_xp_points = (current_user.total_xp_points or 0) + 30
                db.add(current_user)
                
            progress_percent = enrollment.progress_percent

    db.commit()

    return st.TechQuizResult(
        score=score,
        passed=passed,
        progress_percent=progress_percent
    )
