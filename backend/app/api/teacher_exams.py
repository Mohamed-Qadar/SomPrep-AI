from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from typing import List
import datetime

from app import models, schemas
from app.api.auth import require_role, get_current_user
from app.database import get_db
from app.config import settings
from app.utils.access import check_content_access, get_allowed_grades, require_active_subscription

router = APIRouter(prefix="/api", tags=["Teacher Exam Management"])


ALLOWED_MATERIAL_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
    ".txt", ".csv", ".png", ".jpg", ".jpeg", ".webp", ".zip"
}


def _teacher_can_manage_grade(teacher: models.User, grade_level: int) -> bool:
    if teacher.role == "admin":
        return True
    scope = teacher.teacher_package_scope or "academic"
    allowed = get_allowed_grades(scope)
    return not allowed or grade_level in allowed


def _ensure_teacher_grade_scope(teacher: models.User, grade_level: int):
    if not _teacher_can_manage_grade(teacher, grade_level):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This teacher is not assigned to this package/grade range.",
        )


def _material_path(file_key: str) -> Path:
    return settings.teacher_material_storage_dir / file_key


def _validate_material_filename(filename: str) -> str:
    ext = Path(filename or "").suffix.lower()
    if ext not in ALLOWED_MATERIAL_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported material type. Upload PDF, Word, PowerPoint, spreadsheet, image, text, CSV, or ZIP files.",
        )
    return ext


# ─────────────────────────────────────────────────────────────────────────────
# TEACHER ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/teacher/exams", response_model=List[schemas.TeacherExamOut])
def get_my_exams(
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher"])),
):
    """
    Get all exams created by the logged-in teacher.
    """
    return (
        db.query(models.TeacherExam)
        .options(joinedload(models.TeacherExam.questions))
        .filter(models.TeacherExam.teacher_id == teacher.id)
        .all()
    )


@router.post("/teacher/exams", response_model=schemas.TeacherExamOut, status_code=status.HTTP_201_CREATED)
def create_exam(
    exam_in: schemas.TeacherExamCreate,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher"])),
):
    """
    Create a new teacher exam with nested questions.
    """
    _ensure_teacher_grade_scope(teacher, exam_in.grade_level)

    new_exam = models.TeacherExam(
        teacher_id=teacher.id,
        title=exam_in.title,
        subject=exam_in.subject,
        grade_level=exam_in.grade_level,
        exam_type=exam_in.exam_type,
        instructions=exam_in.instructions,
        duration_minutes=exam_in.duration_minutes,
        is_open=exam_in.is_open,
        allow_review=exam_in.allow_review,
        start_time=exam_in.start_time,
        end_time=exam_in.end_time,
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)

    # Add questions
    for idx, q_in in enumerate(exam_in.questions):
        new_q = models.TeacherExamQuestion(
            exam_id=new_exam.id,
            question_text=q_in.question_text,
            option_a=q_in.option_a,
            option_b=q_in.option_b,
            option_c=q_in.option_c,
            option_d=q_in.option_d,
            correct_answer=q_in.correct_answer,
            explanation=q_in.explanation,
            order_index=q_in.order_index or idx,
        )
        db.add(new_q)

    db.commit()
    db.refresh(new_exam)
    return new_exam


@router.get("/teacher/exams/{exam_id}", response_model=schemas.TeacherExamOut)
def get_exam_details(
    exam_id: int,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher"])),
):
    """
    Retrieve details of a specific teacher exam, including its questions.
    """
    exam = (
        db.query(models.TeacherExam)
        .options(joinedload(models.TeacherExam.questions))
        .filter(models.TeacherExam.id == exam_id, models.TeacherExam.teacher_id == teacher.id)
        .first()
    )
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imtixaanka la codsaday laguma helin ama ma haysatid fasax.",
        )
    return exam


@router.patch("/teacher/exams/{exam_id}", response_model=schemas.TeacherExamOut)
def update_exam(
    exam_id: int,
    exam_in: schemas.TeacherExamUpdate,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher"])),
):
    """
    Update exam configuration settings.
    """
    exam = db.query(models.TeacherExam).filter(
        models.TeacherExam.id == exam_id,
        models.TeacherExam.teacher_id == teacher.id
    ).first()

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imtixaanka la codsaday laguma helin.",
        )

    update_data = exam_in.model_dump(exclude_unset=True)
    if "grade_level" in update_data:
        _ensure_teacher_grade_scope(teacher, update_data["grade_level"])
    for field, val in update_data.items():
        setattr(exam, field, val)

    db.commit()
    db.refresh(exam)
    return exam


@router.delete("/teacher/exams/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher"])),
):
    """
    Delete a teacher-created exam.
    """
    exam = db.query(models.TeacherExam).filter(
        models.TeacherExam.id == exam_id,
        models.TeacherExam.teacher_id == teacher.id
    ).first()

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imtixaanka la codsaday laguma helin.",
        )

    db.delete(exam)
    db.commit()
    return None


@router.patch("/teacher/exams/{exam_id}/toggle-open", response_model=schemas.TeacherExamOut)
def toggle_open_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher"])),
):
    """
    Toggle if the exam is active/open for student submissions.
    """
    exam = db.query(models.TeacherExam).filter(
        models.TeacherExam.id == exam_id,
        models.TeacherExam.teacher_id == teacher.id
    ).first()

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imtixaanka la codsaday laguma helin.",
        )

    exam.is_open = not exam.is_open
    db.commit()
    db.refresh(exam)
    return exam


@router.patch("/teacher/exams/{exam_id}/toggle-review", response_model=schemas.TeacherExamOut)
def toggle_review_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher"])),
):
    """
    Toggle if students can review their detailed scores/answers after submission.
    """
    exam = db.query(models.TeacherExam).filter(
        models.TeacherExam.id == exam_id,
        models.TeacherExam.teacher_id == teacher.id
    ).first()

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imtixaanka la codsaday laguma helin.",
        )

    exam.allow_review = not exam.allow_review
    db.commit()
    db.refresh(exam)
    return exam


@router.get("/teacher/exams/{exam_id}/results", response_model=List[schemas.TeacherExamAttemptOut])
def get_exam_results(
    exam_id: int,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher"])),
):
    """
    Get all student attempts for a specific teacher-created exam.
    """
    exam = db.query(models.TeacherExam).filter(
        models.TeacherExam.id == exam_id,
        models.TeacherExam.teacher_id == teacher.id
    ).first()

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imtixaanka la codsaday laguma helin.",
        )

    attempts = (
        db.query(models.TeacherExamAttempt)
        .options(joinedload(models.TeacherExamAttempt.student))
        .filter(models.TeacherExamAttempt.exam_id == exam_id)
        .all()
    )

    results = []
    for att in attempts:
        results.append(
            schemas.TeacherExamAttemptOut(
                id=att.id,
                exam_id=att.exam_id,
                student_id=att.student_id,
                started_at=att.started_at,
                submitted_at=att.submitted_at,
                score=att.score,
                answers=att.answers,
                time_spent_seconds=att.time_spent_seconds,
                student_name=att.student.full_name,
                exam_title=exam.title,
            )
        )
    return results


# ─────────────────────────────────────────────────────────────────────────────
# EXAM MATERIALS (PDF / Word / PowerPoint / images / etc.)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/teacher/exams/{exam_id}/materials",
    response_model=schemas.TeacherExamMaterialOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_exam_material(
    exam_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher", "admin"])),
):
    """
    Attach a study/reference file to an exam. Accepted formats: PDF, Word,
    PowerPoint, spreadsheets, images (PNG/JPG/WEBP), text, CSV, ZIP.
    """
    exam = db.query(models.TeacherExam).filter(
        models.TeacherExam.id == exam_id,
        models.TeacherExam.teacher_id == teacher.id,
    ).first()
    if not exam and teacher.role == "admin":
        exam = db.query(models.TeacherExam).filter(models.TeacherExam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Imtixaanka la codsaday laguma helin.")

    ext = _validate_material_filename(file.filename)
    contents = await file.read()
    max_bytes = int(settings.MAX_TEACHER_MATERIAL_SIZE_MB * 1024 * 1024)
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.MAX_TEACHER_MATERIAL_SIZE_MB:g} MB.",
        )

    storage_dir = settings.teacher_material_storage_dir
    storage_dir.mkdir(parents=True, exist_ok=True)
    file_key = f"{uuid4().hex}{ext}"
    (_material_path(file_key)).write_bytes(contents)

    material = models.TeacherExamMaterial(
        exam_id=exam.id,
        uploaded_by_id=teacher.id,
        title=Path(file.filename).stem[:200] or "Material",
        file_key=file_key,
        original_filename=file.filename[:255],
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(contents),
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.delete(
    "/teacher/exams/{exam_id}/materials/{material_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_exam_material(
    exam_id: int,
    material_id: int,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher", "admin"])),
):
    material = (
        db.query(models.TeacherExamMaterial)
        .join(models.TeacherExam, models.TeacherExam.id == models.TeacherExamMaterial.exam_id)
        .filter(
            models.TeacherExamMaterial.id == material_id,
            models.TeacherExamMaterial.exam_id == exam_id,
        )
        .first()
    )
    if not material:
        raise HTTPException(status_code=404, detail="Agabka la codsaday lama helin.")
    if teacher.role != "admin" and material.exam.teacher_id != teacher.id:
        raise HTTPException(status_code=403, detail="Ma haysatid fasax agabkan.")

    path = _material_path(material.file_key)
    db.delete(material)
    db.commit()
    if path.exists():
        path.unlink()
    return None


@router.get("/exams/teacher-exams/materials/{material_id}/download")
def download_exam_material(
    material_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Download an exam material. Teachers/admins can always download their
    content; students need an active package covering the exam's grade.
    """
    material = (
        db.query(models.TeacherExamMaterial)
        .options(joinedload(models.TeacherExamMaterial.exam))
        .filter(models.TeacherExamMaterial.id == material_id)
        .first()
    )
    if not material:
        raise HTTPException(status_code=404, detail="Agabka la codsaday lama helin.")

    exam = material.exam
    is_staff = user.role == "admin" or (user.role == "teacher" and exam.teacher_id == user.id)
    if not is_staff:
        if not exam.is_open:
            raise HTTPException(status_code=404, detail="Imtixaanku hadda ma furna.")
        if not check_content_access(user, exam.grade_level):
            raise HTTPException(status_code=403, detail="Package upgrade required")

    path = _material_path(material.file_key)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File is missing from storage.")
    return FileResponse(
        path,
        media_type=material.content_type,
        filename=material.original_filename,
    )


# ─────────────────────────────────────────────────────────────────────────────
# STUDENT ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/exams/teacher-exams", response_model=List[schemas.TeacherExamOut])
def get_student_teacher_exams(
    db: Session = Depends(get_db),
    student: models.User = Depends(get_current_user),
):
    """
    Get all open teacher-assigned exams matching student's grade level.
    """
    if not check_content_access(student, student.grade_level):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Package upgrade required"
        )

    return (
        db.query(models.TeacherExam)
        .options(joinedload(models.TeacherExam.questions), joinedload(models.TeacherExam.materials))
        .filter(
            models.TeacherExam.is_open == True,
            models.TeacherExam.grade_level == student.grade_level
        )
        .all()
    )


@router.get("/exams/teacher-exams/attempts", response_model=List[schemas.TeacherExamAttemptOut])
def get_my_teacher_exam_attempts(
    db: Session = Depends(get_db),
    student: models.User = Depends(get_current_user),
):
    """
    Get all teacher exam attempts completed by the student.
    """
    attempts = (
        db.query(models.TeacherExamAttempt)
        .options(joinedload(models.TeacherExamAttempt.exam))
        .filter(models.TeacherExamAttempt.student_id == student.id)
        .all()
    )
    return [
        schemas.TeacherExamAttemptOut(
            id=att.id,
            exam_id=att.exam_id,
            student_id=att.student_id,
            started_at=att.started_at,
            submitted_at=att.submitted_at,
            score=att.score,
            answers=att.answers,
            time_spent_seconds=att.time_spent_seconds,
            student_name=student.full_name,
            exam_title=att.exam.title,
        )
        for att in attempts
    ]


@router.get("/exams/teacher-exams/attempts/{attempt_id}", response_model=schemas.TeacherExamAttemptOut)
def get_student_teacher_exam_attempt_detail(
    attempt_id: int,
    db: Session = Depends(get_db),
    student: models.User = Depends(get_current_user),
):
    """
    Retrieve details of a specific completed teacher exam attempt for the student.
    """
    attempt = (
        db.query(models.TeacherExamAttempt)
        .options(joinedload(models.TeacherExamAttempt.exam))
        .filter(
            models.TeacherExamAttempt.id == attempt_id,
            models.TeacherExamAttempt.student_id == student.id
        )
        .first()
    )
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Isku dayga imtixaanka la codsaday lama helin ama laguma helin.",
        )
    return schemas.TeacherExamAttemptOut(
        id=attempt.id,
        exam_id=attempt.exam_id,
        student_id=attempt.student_id,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        score=attempt.score,
        answers=attempt.answers,
        time_spent_seconds=attempt.time_spent_seconds,
        student_name=student.full_name,
        exam_title=attempt.exam.title,
    )


@router.get("/exams/teacher-exams/{exam_id}", response_model=schemas.TeacherExamOut)
def get_student_teacher_exam_details(
    exam_id: int,
    db: Session = Depends(get_db),
    student: models.User = Depends(get_current_user),
):
    """
    Get details of a specific open teacher exam, including questions.
    """
    exam = db.query(models.TeacherExam).options(joinedload(models.TeacherExam.questions), joinedload(models.TeacherExam.materials)).filter(
        models.TeacherExam.id == exam_id,
        models.TeacherExam.is_open == True
    ).first()
    
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imtixaanka la codsaday laguma helin ama hadda ma furna.",
        )
        
    from app.utils.access import check_content_access
    if not check_content_access(student, exam.grade_level):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Package upgrade required"
        )
    return exam




@router.post("/exams/teacher-exams/{exam_id}/start", response_model=schemas.TeacherExamAttemptOut)
def start_teacher_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    student: models.User = Depends(get_current_user),
):
    """
    Create a new attempt session for a teacher-assigned exam.
    """
    exam = db.query(models.TeacherExam).filter(
        models.TeacherExam.id == exam_id,
        models.TeacherExam.is_open == True
    ).first()

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imtixaanku hadda ma furna (Exam not active).",
        )

    from app.utils.access import check_content_access
    if not check_content_access(student, exam.grade_level):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Package upgrade required"
        )

    # Check for active attempt
    existing = db.query(models.TeacherExamAttempt).filter(
        models.TeacherExamAttempt.exam_id == exam_id,
        models.TeacherExamAttempt.student_id == student.id,
        models.TeacherExamAttempt.submitted_at == None
    ).first()

    if existing:
        return schemas.TeacherExamAttemptOut(
            id=existing.id,
            exam_id=existing.exam_id,
            student_id=existing.student_id,
            started_at=existing.started_at,
            submitted_at=existing.submitted_at,
            score=existing.score,
            answers=existing.answers,
            time_spent_seconds=existing.time_spent_seconds,
            student_name=student.full_name,
            exam_title=exam.title,
        )

    new_attempt = models.TeacherExamAttempt(
        exam_id=exam_id,
        student_id=student.id,
        started_at=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None),
        time_spent_seconds=0,
    )
    db.add(new_attempt)
    db.commit()
    db.refresh(new_attempt)

    return schemas.TeacherExamAttemptOut(
        id=new_attempt.id,
        exam_id=new_attempt.exam_id,
        student_id=new_attempt.student_id,
        started_at=new_attempt.started_at,
        submitted_at=new_attempt.submitted_at,
        score=new_attempt.score,
        answers=new_attempt.answers,
        time_spent_seconds=new_attempt.time_spent_seconds,
        student_name=student.full_name,
        exam_title=exam.title,
    )


@router.post("/exams/teacher-exams/{exam_id}/submit")
def submit_teacher_exam(
    exam_id: int,
    submission: schemas.TeacherExamAttemptSubmit,
    db: Session = Depends(get_db),
    student: models.User = Depends(get_current_user),
):
    """
    Submit answers for a teacher exam and calculate the score.
    """
    exam = db.query(models.TeacherExam).options(joinedload(models.TeacherExam.questions)).filter(
        models.TeacherExam.id == exam_id
    ).first()

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imtixaanka la codsaday lama helin.",
        )

    from app.utils.access import check_content_access
    if not check_content_access(student, exam.grade_level):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Package upgrade required"
        )

    attempt = db.query(models.TeacherExamAttempt).filter(
        models.TeacherExamAttempt.exam_id == exam_id,
        models.TeacherExamAttempt.student_id == student.id,
        models.TeacherExamAttempt.submitted_at == None
    ).first()

    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Wax isku day ah oo furan laguma helin imtixaankan.",
        )

    # Score calculation
    questions = exam.questions
    correct_count = 0
    total_count = len(questions)

    for q in questions:
        # submission.answers is a dict like {"12": "A"}
        student_answer = submission.answers.get(str(q.id))
        if student_answer and student_answer.upper() == q.correct_answer.upper():
            correct_count += 1

    score = (correct_count / total_count * 100) if total_count > 0 else 0.0

    attempt.submitted_at = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    attempt.score = score
    attempt.answers = submission.answers
    attempt.time_spent_seconds = submission.time_spent_seconds

    db.commit()
    db.refresh(attempt)

    return {
        "success": True,
        "score": score,
        "correct_answers": correct_count,
        "total_questions": total_count,
        "attempt_id": attempt.id
    }
