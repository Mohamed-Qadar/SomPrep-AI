from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.api.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/videos", tags=["Videos"])


def _subscription_gate(current_user: models.User):
    """Raises HTTP 402 if subscription is inactive or expired."""
    sub = current_user.subscription
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if not sub or sub.status != "active" or sub.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Subscription required. Please pay the $2.50 EVC Plus 12-Month Access fee.",
        )


@router.get("/{subtopic_id}", response_model=List[schemas.VideoLessonOut])
def get_videos_for_subtopic(
    subtopic_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Fetch all video lessons under a subtopic. Blocks if subscription is inactive.
    Includes student watch progress information.
    """
    _subscription_gate(current_user)
    
    subtopic = db.query(models.SubTopic).filter(models.SubTopic.id == subtopic_id).first()
    if not subtopic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SubTopic not found"
        )

    from app.utils.access import check_content_access
    if not check_content_access(current_user, subtopic.category.grade_level):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Package upgrade required"
        )

    videos = (
        db.query(models.VideoLesson)
        .filter(models.VideoLesson.subtopic_id == subtopic_id)
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


@router.post("/watch", response_model=schemas.VideoLessonOut)
def watch_video(
    watch_in: schemas.VideoWatchLogSubmit,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Logs video watch time. Marks completed if student watched >= 90% of duration.
    Awards 15 XP for completing a video lecture for the first time.
    """
    _subscription_gate(current_user)

    video = db.query(models.VideoLesson).filter(models.VideoLesson.id == watch_in.video_id).first()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video lesson not found."
        )

    from app.utils.access import check_content_access
    if not check_content_access(current_user, video.subtopic.category.grade_level):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Package upgrade required"
        )

    log = (
        db.query(models.VideoWatchLog)
        .filter(
            models.VideoWatchLog.user_id == current_user.id,
            models.VideoWatchLog.video_id == video.id
        )
        .first()
    )

    # Check if 90% watched
    is_completed = False
    if video.duration > 0:
        is_completed = watch_in.watched_seconds >= (video.duration * 0.9)

    already_completed = log.is_completed if log else False

    if log:
        if watch_in.watched_seconds > log.watched_seconds:
            log.watched_seconds = watch_in.watched_seconds
        if is_completed:
            log.is_completed = True
    else:
        log = models.VideoWatchLog(
            user_id=current_user.id,
            video_id=video.id,
            watched_seconds=watch_in.watched_seconds,
            is_completed=is_completed
        )
        db.add(log)

    db.commit()
    db.refresh(log)

    # Award XP if completed for the first time
    if log.is_completed and not already_completed:
        user = db.query(models.User).filter(models.User.id == current_user.id).first()
        if user:
            user.total_xp_points = (user.total_xp_points or 0) + 15
            db.commit()

    return schemas.VideoLessonOut(
        id=video.id,
        subtopic_id=video.subtopic_id,
        title=video.title,
        video_url=video.video_url,
        duration=video.duration,
        order_index=video.order_index,
        is_watched=True,
        watched_seconds=log.watched_seconds,
        is_completed=log.is_completed
    )
