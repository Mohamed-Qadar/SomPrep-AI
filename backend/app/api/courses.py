from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.api.auth import get_current_user
from app.utils.access import check_content_access, require_package_access

router = APIRouter(prefix="", tags=["Package Course Content"])

@router.get("/api/courses/{grade_level}", response_model=List[schemas.CategoryOut])
def get_courses_by_grade(
    grade_level: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_package_access()),
):
    """
    Fetch all active subject categories (courses) for a specific grade level,
    guarded by the student's active package allowance.
    """
    return db.query(models.Category).filter(models.Category.grade_level == grade_level).all()


@router.get("/api/videos/{grade_level}", response_model=List[schemas.VideoLessonOut])
def get_videos_by_grade(
    grade_level: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_package_access()),
):
    """
    Fetch all video lessons under the specified grade level, with student watch progress,
    guarded by the student's active package allowance.
    """
    
    videos = (
        db.query(models.VideoLesson)
        .join(models.SubTopic)
        .join(models.Category)
        .filter(models.Category.grade_level == grade_level)
        .order_by(models.VideoLesson.order_index)
        .all()
    )
    
    if not videos:
        return []

    watch_logs = (
        db.query(models.VideoWatchLog)
        .filter(
            models.VideoWatchLog.user_id == current_user.id,
            models.VideoWatchLog.video_id.in_([v.id for v in videos])
        )
        .all()
    )
    watch_map = {w.video_id: w for w in watch_logs}

    result = []
    for v in videos:
        log = watch_map.get(v.id)
        result.append(
            schemas.VideoLessonOut(
                id=v.id,
                subtopic_id=v.subtopic_id,
                title=v.title,
                video_url=v.video_url,
                duration=v.duration,
                order_index=v.order_index,
                is_watched=log is not None,
                watched_seconds=log.watched_seconds if log else 0,
                is_completed=log.is_completed if log else False,
            )
        )
    return result


@router.get("/api/exams/grade/{grade_level}", response_model=List[schemas.MockExamOut])
def get_exams_by_grade(
    grade_level: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_package_access()),
):
    """
    Fetch all mock exams available for the specified grade level,
    guarded by the student's active package allowance.
    """
    return db.query(models.MockExam).filter(models.MockExam.grade_level == grade_level).all()
