"""
Teacher LMS: structured courses (chapters → lessons) plus teacher analytics
and a student roster. Lessons can be videos, uploaded materials, quizzes
(linked TeacherExams), or assignments. Students only see published courses
for their grade, and only with an active package covering it.
"""
from pathlib import Path
from uuid import uuid4
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.api.auth import require_role, get_current_user
from app.api.teacher_exams import (
    ALLOWED_MATERIAL_EXTENSIONS,
    _ensure_teacher_grade_scope,
    _validate_material_filename,
)
from app.config import settings
from app.database import get_db
from app.utils.access import check_content_access, get_allowed_grades

router = APIRouter(prefix="/api", tags=["Teacher Courses (LMS)"])


def _lesson_file_path(file_key: str) -> Path:
    return settings.teacher_material_storage_dir / file_key


def _course_out(course: models.TeacherCourse) -> schemas.TeacherCourseOut:
    out = schemas.TeacherCourseOut.model_validate(course)
    out.teacher_name = course.teacher.full_name if course.teacher else None
    for chapter in out.chapters:
        for lesson in chapter.lessons:
            if lesson.original_filename:
                lesson.file_download_url = f"/api/student/courses/lessons/{lesson.id}/file"
    return out


def _own_course(db: Session, course_id: int, teacher: models.User) -> models.TeacherCourse:
    q = db.query(models.TeacherCourse).filter(models.TeacherCourse.id == course_id)
    if teacher.role != "admin":
        q = q.filter(models.TeacherCourse.teacher_id == teacher.id)
    course = q.first()
    if not course:
        raise HTTPException(status_code=404, detail="Koorsada la codsaday lama helin. (Course not found.)")
    return course


def _own_lesson(db: Session, lesson_id: int, teacher: models.User) -> models.CourseLesson:
    lesson = (
        db.query(models.CourseLesson)
        .options(joinedload(models.CourseLesson.chapter).joinedload(models.CourseChapter.course))
        .filter(models.CourseLesson.id == lesson_id)
        .first()
    )
    if not lesson or (teacher.role != "admin" and lesson.chapter.course.teacher_id != teacher.id):
        raise HTTPException(status_code=404, detail="Cashirka la codsaday lama helin. (Lesson not found.)")
    return lesson


def _validate_lesson_links(db: Session, teacher: models.User, payload) -> None:
    """A lesson may only link the teacher's own video/exam."""
    if getattr(payload, "video_id", None):
        video = db.query(models.TeacherVideo).filter(models.TeacherVideo.id == payload.video_id).first()
        if not video or (teacher.role != "admin" and video.teacher_id != teacher.id):
            raise HTTPException(status_code=400, detail="Linked video not found or not yours.")
    if getattr(payload, "exam_id", None):
        exam = db.query(models.TeacherExam).filter(models.TeacherExam.id == payload.exam_id).first()
        if not exam or (teacher.role != "admin" and exam.teacher_id != teacher.id):
            raise HTTPException(status_code=400, detail="Linked exam not found or not yours.")


# ─────────────────────────────────────────────────────────────────────────────
# TEACHER: course / chapter / lesson management
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/teacher/courses", response_model=List[schemas.TeacherCourseOut])
def list_my_courses(
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher", "admin"])),
):
    q = db.query(models.TeacherCourse).options(
        joinedload(models.TeacherCourse.chapters).joinedload(models.CourseChapter.lessons),
        joinedload(models.TeacherCourse.teacher),
    )
    if teacher.role != "admin":
        q = q.filter(models.TeacherCourse.teacher_id == teacher.id)
    courses = q.order_by(models.TeacherCourse.sort_order, models.TeacherCourse.id).all()
    return [_course_out(c) for c in courses]


@router.post("/teacher/courses", response_model=schemas.TeacherCourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: schemas.TeacherCourseCreate,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher", "admin"])),
):
    _ensure_teacher_grade_scope(teacher, payload.grade_level)
    course = models.TeacherCourse(teacher_id=teacher.id, **payload.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return _course_out(course)


@router.patch("/teacher/courses/{course_id}", response_model=schemas.TeacherCourseOut)
def update_course(
    course_id: int,
    payload: schemas.TeacherCourseUpdate,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher", "admin"])),
):
    course = _own_course(db, course_id, teacher)
    changes = payload.model_dump(exclude_unset=True)
    if "grade_level" in changes:
        _ensure_teacher_grade_scope(teacher, changes["grade_level"])
    for key, value in changes.items():
        setattr(course, key, value)
    db.commit()
    db.refresh(course)
    return _course_out(course)


@router.delete("/teacher/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher", "admin"])),
):
    course = _own_course(db, course_id, teacher)
    # Remove any uploaded lesson files with the course.
    for chapter in course.chapters:
        for lesson in chapter.lessons:
            if lesson.file_key:
                path = _lesson_file_path(lesson.file_key)
                if path.exists():
                    path.unlink()
    db.delete(course)
    db.commit()
    return None


@router.post("/teacher/courses/{course_id}/chapters", response_model=schemas.CourseChapterOut, status_code=status.HTTP_201_CREATED)
def add_chapter(
    course_id: int,
    payload: schemas.CourseChapterCreate,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher", "admin"])),
):
    course = _own_course(db, course_id, teacher)
    chapter = models.CourseChapter(course_id=course.id, **payload.model_dump())
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return chapter


@router.patch("/teacher/chapters/{chapter_id}", response_model=schemas.CourseChapterOut)
def update_chapter(
    chapter_id: int,
    payload: schemas.CourseChapterCreate,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher", "admin"])),
):
    chapter = db.query(models.CourseChapter).options(
        joinedload(models.CourseChapter.course)
    ).filter(models.CourseChapter.id == chapter_id).first()
    if not chapter or (teacher.role != "admin" and chapter.course.teacher_id != teacher.id):
        raise HTTPException(status_code=404, detail="Cutubka la codsaday lama helin. (Chapter not found.)")
    chapter.title = payload.title
    chapter.sort_order = payload.sort_order
    db.commit()
    db.refresh(chapter)
    return chapter


@router.delete("/teacher/chapters/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chapter(
    chapter_id: int,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher", "admin"])),
):
    chapter = db.query(models.CourseChapter).options(
        joinedload(models.CourseChapter.course), joinedload(models.CourseChapter.lessons)
    ).filter(models.CourseChapter.id == chapter_id).first()
    if not chapter or (teacher.role != "admin" and chapter.course.teacher_id != teacher.id):
        raise HTTPException(status_code=404, detail="Cutubka la codsaday lama helin. (Chapter not found.)")
    for lesson in chapter.lessons:
        if lesson.file_key:
            path = _lesson_file_path(lesson.file_key)
            if path.exists():
                path.unlink()
    db.delete(chapter)
    db.commit()
    return None


@router.post("/teacher/chapters/{chapter_id}/lessons", response_model=schemas.CourseLessonOut, status_code=status.HTTP_201_CREATED)
def add_lesson(
    chapter_id: int,
    payload: schemas.CourseLessonCreate,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher", "admin"])),
):
    chapter = db.query(models.CourseChapter).options(
        joinedload(models.CourseChapter.course)
    ).filter(models.CourseChapter.id == chapter_id).first()
    if not chapter or (teacher.role != "admin" and chapter.course.teacher_id != teacher.id):
        raise HTTPException(status_code=404, detail="Cutubka la codsaday lama helin. (Chapter not found.)")
    _validate_lesson_links(db, teacher, payload)
    lesson = models.CourseLesson(chapter_id=chapter.id, **payload.model_dump())
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.patch("/teacher/lessons/{lesson_id}", response_model=schemas.CourseLessonOut)
def update_lesson(
    lesson_id: int,
    payload: schemas.CourseLessonUpdate,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher", "admin"])),
):
    lesson = _own_lesson(db, lesson_id, teacher)
    _validate_lesson_links(db, teacher, payload)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(lesson, key, value)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/teacher/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher", "admin"])),
):
    lesson = _own_lesson(db, lesson_id, teacher)
    if lesson.file_key:
        path = _lesson_file_path(lesson.file_key)
        if path.exists():
            path.unlink()
    db.delete(lesson)
    db.commit()
    return None


@router.post("/teacher/lessons/{lesson_id}/file", response_model=schemas.CourseLessonOut)
async def upload_lesson_file(
    lesson_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher", "admin"])),
):
    """Attach/replace the lesson's file (PDF, Word, PowerPoint, image, ...)."""
    lesson = _own_lesson(db, lesson_id, teacher)
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
    if lesson.file_key:
        old = _lesson_file_path(lesson.file_key)
        if old.exists():
            old.unlink()
    file_key = f"{uuid4().hex}{ext}"
    _lesson_file_path(file_key).write_bytes(contents)

    lesson.file_key = file_key
    lesson.original_filename = file.filename[:255]
    lesson.content_type = file.content_type or "application/octet-stream"
    lesson.size_bytes = len(contents)
    db.commit()
    db.refresh(lesson)
    out = schemas.CourseLessonOut.model_validate(lesson)
    out.file_download_url = f"/api/student/courses/lessons/{lesson.id}/file"
    return out


# ─────────────────────────────────────────────────────────────────────────────
# TEACHER: analytics + student roster
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/teacher/analytics", response_model=schemas.TeacherAnalyticsOut)
def teacher_analytics(
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher", "admin"])),
):
    """One aggregated call replacing the dashboard's N+1 per-exam requests."""
    tid = teacher.id
    total_courses = db.query(models.TeacherCourse).filter(models.TeacherCourse.teacher_id == tid).count()
    published_courses = db.query(models.TeacherCourse).filter(
        models.TeacherCourse.teacher_id == tid, models.TeacherCourse.is_published == True
    ).count()
    total_videos = db.query(models.TeacherVideo).filter(models.TeacherVideo.teacher_id == tid).count()
    exams = db.query(models.TeacherExam).filter(models.TeacherExam.teacher_id == tid).all()
    exam_ids = [e.id for e in exams]

    attempts_q = db.query(models.TeacherExamAttempt).filter(
        models.TeacherExamAttempt.exam_id.in_(exam_ids) if exam_ids else False
    )
    total_attempts = attempts_q.count() if exam_ids else 0
    submitted = attempts_q.filter(models.TeacherExamAttempt.submitted_at.isnot(None)).all() if exam_ids else []
    avg_score = round(sum(a.score or 0 for a in submitted) / len(submitted), 1) if submitted else 0.0
    students_reached = (
        db.query(func.count(func.distinct(models.TeacherExamAttempt.student_id)))
        .filter(models.TeacherExamAttempt.exam_id.in_(exam_ids)).scalar()
        if exam_ids else 0
    )

    per_exam = []
    for e in exams:
        e_sub = [a for a in submitted if a.exam_id == e.id]
        per_exam.append({
            "exam_id": e.id,
            "title": e.title,
            "exam_type": e.exam_type,
            "grade_level": e.grade_level,
            "is_open": e.is_open,
            "attempts": len(e_sub),
            "average_score": round(sum(a.score or 0 for a in e_sub) / len(e_sub), 1) if e_sub else None,
        })

    recent = (
        db.query(models.TeacherExamAttempt)
        .options(joinedload(models.TeacherExamAttempt.student), joinedload(models.TeacherExamAttempt.exam))
        .filter(models.TeacherExamAttempt.exam_id.in_(exam_ids) if exam_ids else False)
        .order_by(models.TeacherExamAttempt.started_at.desc())
        .limit(8)
        .all()
    ) if exam_ids else []

    return schemas.TeacherAnalyticsOut(
        total_courses=total_courses,
        published_courses=published_courses,
        total_videos=total_videos,
        total_exams=len(exams),
        open_exams=sum(1 for e in exams if e.is_open),
        total_attempts=total_attempts,
        submitted_attempts=len(submitted),
        average_score=avg_score,
        students_reached=students_reached or 0,
        exams_breakdown=per_exam,
        recent_attempts=[
            schemas.TeacherExamAttemptOut(
                id=a.id, exam_id=a.exam_id, student_id=a.student_id,
                started_at=a.started_at, submitted_at=a.submitted_at,
                score=a.score, answers=None, time_spent_seconds=a.time_spent_seconds,
                student_name=a.student.full_name if a.student else None,
                exam_title=a.exam.title if a.exam else None,
            )
            for a in recent
        ],
    )


@router.get("/teacher/students", response_model=List[schemas.TeacherStudentOut])
def teacher_students(
    db: Session = Depends(get_db),
    teacher: models.User = Depends(require_role(["teacher", "admin"])),
):
    """Students within the teacher's grade scope, with their activity summary."""
    scope = teacher.teacher_package_scope or "academic"
    allowed = get_allowed_grades(scope) or list(range(1, 13))
    students = (
        db.query(models.User)
        .filter(models.User.role == "student", models.User.grade_level.in_(allowed))
        .order_by(models.User.grade_level, models.User.full_name)
        .all()
    )
    exam_ids = [
        e.id for e in db.query(models.TeacherExam.id).filter(models.TeacherExam.teacher_id == teacher.id).all()
    ]
    result = []
    for s in students:
        attempts = (
            db.query(models.TeacherExamAttempt)
            .filter(
                models.TeacherExamAttempt.student_id == s.id,
                models.TeacherExamAttempt.exam_id.in_(exam_ids) if exam_ids else False,
            )
            .all()
        ) if exam_ids else []
        scored = [a for a in attempts if a.score is not None]
        last = max((a.submitted_at or a.started_at for a in attempts), default=None)
        result.append(schemas.TeacherStudentOut(
            id=s.id,
            full_name=s.full_name,
            phone_number=s.phone_number,
            grade_level=s.grade_level,
            package_type=s.package_type,
            package_active=bool(s.package_active),
            attempts_count=len(attempts),
            average_score=round(sum(a.score for a in scored) / len(scored), 1) if scored else None,
            last_activity=last,
        ))
    return result


# ─────────────────────────────────────────────────────────────────────────────
# STUDENT: published courses for my grade (package-gated)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/student/courses", response_model=List[schemas.TeacherCourseOut])
def student_courses(
    db: Session = Depends(get_db),
    student: models.User = Depends(get_current_user),
):
    if not check_content_access(student, student.grade_level):
        raise HTTPException(status_code=403, detail="Package upgrade required")
    courses = (
        db.query(models.TeacherCourse)
        .options(
            joinedload(models.TeacherCourse.chapters).joinedload(models.CourseChapter.lessons),
            joinedload(models.TeacherCourse.teacher),
        )
        .filter(
            models.TeacherCourse.is_published == True,
            models.TeacherCourse.grade_level == student.grade_level,
        )
        .order_by(models.TeacherCourse.sort_order, models.TeacherCourse.id)
        .all()
    )
    return [_course_out(c) for c in courses]


@router.get("/student/courses/lessons/{lesson_id}/file")
def download_lesson_file(
    lesson_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    lesson = (
        db.query(models.CourseLesson)
        .options(joinedload(models.CourseLesson.chapter).joinedload(models.CourseChapter.course))
        .filter(models.CourseLesson.id == lesson_id)
        .first()
    )
    if not lesson or not lesson.file_key:
        raise HTTPException(status_code=404, detail="Faylka la codsaday lama helin. (File not found.)")

    course = lesson.chapter.course
    is_staff = user.role == "admin" or (user.role == "teacher" and course.teacher_id == user.id)
    if not is_staff:
        if not course.is_published:
            raise HTTPException(status_code=404, detail="Koorsadan lama daabicin. (Course not published.)")
        if not check_content_access(user, course.grade_level):
            raise HTTPException(status_code=403, detail="Package upgrade required")

    path = _lesson_file_path(lesson.file_key)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File is missing from storage.")
    return FileResponse(path, media_type=lesson.content_type, filename=lesson.original_filename)
