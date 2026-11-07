from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.api.auth import require_role
from app.database import get_db
from app.utils.audit import log_admin_action
from app.utils.auth import get_password_hash

router = APIRouter(prefix="/api/admin", tags=["Admin User Management"])


@router.post("/create-teacher", response_model=schemas.TeacherOut, status_code=status.HTTP_201_CREATED)
def create_teacher(
    teacher_in: schemas.TeacherCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role(["admin"])),
):
    """
    Create a new teacher account. Accessible only to administrators.
    """
    # Check if user already exists
    existing = db.query(models.User).filter(models.User.phone_number == teacher_in.phone_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lambarka taleefanka mar hore ayaa la diiwaangeliyey (Phone number already registered).",
        )

    # Hash password
    hashed_password = get_password_hash(teacher_in.password)

    new_teacher = models.User(
        phone_number=teacher_in.phone_number,
        full_name=teacher_in.full_name,
        hashed_password=hashed_password,
        role="teacher",
        subject=teacher_in.subject,
        school=teacher_in.school,
        bio=teacher_in.bio,
        profile_photo_url=teacher_in.profile_photo_url,
        teacher_package_scope=teacher_in.teacher_package_scope,
        is_active=True,
    )

    db.add(new_teacher)
    db.commit()
    db.refresh(new_teacher)
    return new_teacher


@router.get("/teachers", response_model=List[schemas.TeacherOut])
def list_teachers(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role(["admin"])),
):
    """
    List all registered teacher accounts. Accessible only to administrators.
    """
    return db.query(models.User).filter(models.User.role == "teacher").all()


@router.patch("/teachers/{teacher_id}/toggle", response_model=schemas.TeacherOut)
def toggle_teacher_active(
    teacher_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role(["admin"])),
):
    """
    Toggle a teacher account's active status. Accessible only to administrators.
    """
    teacher = db.query(models.User).filter(models.User.id == teacher_id, models.User.role == "teacher").first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Macallinka la codsaday laguma helin keydka macluumaadka.",
        )

    was_active = teacher.is_active
    teacher.is_active = not teacher.is_active
    db.commit()
    db.refresh(teacher)

    log_admin_action(
        db,
        admin=admin,
        action_type="teacher_enabled" if teacher.is_active else "teacher_disabled",
        request=request,
        target_type="user",
        target_id=teacher.id,
        old_value={"is_active": was_active},
        new_value={"is_active": teacher.is_active},
    )
    db.commit()
    return teacher
