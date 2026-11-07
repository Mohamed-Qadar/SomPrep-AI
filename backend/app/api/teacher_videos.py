from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.api.auth import require_role
from app.database import get_db
from app.utils.auth import get_password_hash

router = APIRouter(prefix="/api/teacher", tags=["Teacher Management"])


# --- VIDEOS ---

@router.get("/videos", response_model=List[schemas.TeacherVideoOut])
def get_my_videos(
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher"])),
):
    """
    Get all videos published by the logged-in teacher.
    """
    return db.query(models.TeacherVideo).filter(models.TeacherVideo.teacher_id == teacher.id).all()


@router.post("/videos", response_model=schemas.TeacherVideoOut, status_code=status.HTTP_201_CREATED)
def add_video(
    video_in: schemas.TeacherVideoCreate,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher"])),
):
    """
    Add a video lesson resource.
    """
    new_video = models.TeacherVideo(
        teacher_id=teacher.id,
        title=video_in.title,
        description=video_in.description,
        subject=video_in.subject,
        grade_level=video_in.grade_level,
        video_type=video_in.video_type,
        video_url=video_in.video_url,
        thumbnail_url=video_in.thumbnail_url,
        duration_minutes=video_in.duration_minutes,
        is_published=video_in.is_published,
    )
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    return new_video


@router.patch("/videos/{video_id}", response_model=schemas.TeacherVideoOut)
def edit_video(
    video_id: int,
    video_in: schemas.TeacherVideoUpdate,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher"])),
):
    """
    Edit settings of a video published by the teacher.
    """
    video = db.query(models.TeacherVideo).filter(
        models.TeacherVideo.id == video_id,
        models.TeacherVideo.teacher_id == teacher.id
    ).first()

    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Muuqaalka la codsaday laguma helin ama ma haysatid fasax aad ku beddesho.",
        )

    for field, val in video_in.model_dump(exclude_unset=True).items():
        setattr(video, field, val)

    db.commit()
    db.refresh(video)
    return video


@router.delete("/videos/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_video(
    video_id: int,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher"])),
):
    """
    Delete a video.
    """
    video = db.query(models.TeacherVideo).filter(
        models.TeacherVideo.id == video_id,
        models.TeacherVideo.teacher_id == teacher.id
    ).first()

    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Muuqaalka la codsaday laguma helin ama ma haysatid fasax.",
        )

    db.delete(video)
    db.commit()
    return None


@router.patch("/videos/{video_id}/publish", response_model=schemas.TeacherVideoOut)
def toggle_publish_video(
    video_id: int,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher"])),
):
    """
    Toggle publication status of a video lesson.
    """
    video = db.query(models.TeacherVideo).filter(
        models.TeacherVideo.id == video_id,
        models.TeacherVideo.teacher_id == teacher.id
    ).first()

    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Muuqaalka la codsaday laguma helin ama ma haysatid fasax.",
        )

    video.is_published = not video.is_published
    db.commit()
    db.refresh(video)
    return video


# --- PROFILE UPDATE ---

@router.patch("/profile", response_model=schemas.TeacherOut)
def update_teacher_profile(
    profile_in: schemas.TeacherUpdate,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher"])),
):
    """
    Update teacher details (full_name, school, subject, bio, profile photo, password).
    """
    user = db.query(models.User).filter(models.User.id == teacher.id).first()
    
    update_data = profile_in.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        user.hashed_password = get_password_hash(update_data["password"])
        del update_data["password"]

    for field, val in update_data.items():
        setattr(user, field, val)

    db.commit()
    db.refresh(user)
    return user
