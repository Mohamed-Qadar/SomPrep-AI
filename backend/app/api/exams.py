from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql.expression import func

from app import models, schemas
from app.api.auth import get_current_user, require_role
from app.database import get_db, SessionLocal
from app.services.ai_analytics import generate_learning_insight
from app.services.ai_engine import generate_coach_insight
from app.services.exam_logic import approved_questions_query, calculate_readiness, grade_answers

router = APIRouter(prefix="/api/exams", tags=["Exams"])


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _calc_stars(score: float) -> int:
    """SomPrep star model: 1=70-79%, 2=80-89%, 3=90-100%."""
    if score >= 90.0:
        return 3
    elif score >= 80.0:
        return 2
    elif score >= 70.0:
        return 1
    return 0


def _calc_xp(correct_answers: int, questions: list) -> int:
    """
    Difficulty-weighted XP: easy=10, medium=20, hard=30 per correct answer.
    Questions is a list of model objects passed in. We map question_id → difficulty.
    """
    xp_map = {"easy": 10, "medium": 20, "hard": 30}
    difficulty_lookup = {q.id: q.difficulty_level for q in questions}

    total_xp = 0
    # We use correct_answers count but don't have per-question correctness here;
    # so estimate by averaging difficulty across all questions.
    avg_xp = 0
    if questions:
        avg_xp = sum(xp_map.get(q.difficulty_level, 20) for q in questions) / len(questions)
    total_xp = int(avg_xp * correct_answers)
    return total_xp


def generate_coach_insight_background(user_id: int):
    db = SessionLocal()
    try:
        generate_coach_insight(db, user_id)
    except Exception as exc:  # noqa: BLE001 — background task must not crash submission flow
        import logging
        logging.getLogger("somprep.ai_engine").warning(
            "Background coach insight skipped for user %s: %s", user_id, exc
        )
    finally:
        db.close()


def _subscription_gate(current_user: models.User):
    """Raises HTTP 402 if user subscription is inactive or expired."""
    sub = current_user.subscription
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if not sub or sub.status != "active" or sub.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Subscription required. Please pay the $2.50 EVC Plus 12-Month Access fee.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# CATEGORY & SUBTOPIC ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/categories", response_model=List[schemas.CategoryOut])
def get_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch all active subject categories for user's grade and region."""
    return db.query(models.Category).filter(
        models.Category.grade_level == current_user.grade_level,
        (models.Category.regional_board == "All") | (models.Category.regional_board == current_user.selected_region)
    ).all()


@router.get("/subtopics", response_model=List[schemas.SubTopicOut])
def get_subtopics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch all subtopics ordered by order_index."""
    return db.query(models.SubTopic).order_by(models.SubTopic.order_index).all()


# ─────────────────────────────────────────────────────────────────────────────
# GAMIFIED ROADMAP (Konu Ağacı Haritası)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/roadmap", response_model=List[schemas.CategoryRoadmapOut])
def get_roadmap(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns the full Konu Ağacı (Concept Tree) for the student's selected grade & region.
    Filters categories by student's grade_level and selected_region (or 'All').
    Groups subtopics under their respective Topics.
    """
    categories = (
        db.query(models.Category)
        .options(
            joinedload(models.Category.topics).joinedload(models.Topic.subtopics).joinedload(models.SubTopic.video_lessons)
        )
        .filter(
            models.Category.grade_level == current_user.grade_level,
            (models.Category.regional_board == "All") | (models.Category.regional_board == current_user.selected_region)
        )
        .all()
    )

    # Build progress map for this student: subtopic_id → StudentProgress
    progress_records = db.query(models.StudentProgress).filter(
        models.StudentProgress.user_id == current_user.id
    ).all()
    progress_map = {p.subtopic_id: p for p in progress_records}

    # Fetch watch logs
    watch_logs = db.query(models.VideoWatchLog).filter(
        models.VideoWatchLog.user_id == current_user.id
    ).all()
    completed_video_ids = {w.video_id for w in watch_logs if w.is_completed}

    result = []
    for cat in categories:
        topic_list = []
        sorted_topics = sorted(cat.topics, key=lambda t: t.order_index)
        
        # Flatten all subtopics for this category to enforce sequential unlocking
        all_subs = []
        for t in sorted_topics:
            all_subs.extend(sorted(t.subtopics, key=lambda s: s.order_index))

        # Map to find unlock state
        unlocked_sub_ids = set()
        prev_completed = True
        for idx, sub in enumerate(all_subs):
            prog = progress_map.get(sub.id)
            is_completed = prog.is_completed if prog else False
            
            # Unlock rules
            if idx == 0 or prev_completed:
                unlocked_sub_ids.add(sub.id)
            prev_completed = is_completed

        for t in sorted_topics:
            sub_progress_list = []
            sorted_subs = sorted(t.subtopics, key=lambda s: s.order_index)

            for sub in sorted_subs:
                prog = progress_map.get(sub.id)
                is_completed = prog.is_completed if prog else False
                points = prog.points_earned if prog else 0
                stars = prog.stars_awarded if prog else 0
                is_unlocked = sub.id in unlocked_sub_ids

                # Video watch metrics
                sub_videos = sub.video_lessons
                total_v = len(sub_videos)
                comp_v = sum(1 for v in sub_videos if v.id in completed_video_ids)
                is_v_completed = (comp_v == total_v) if total_v > 0 else True

                sub_progress_list.append(
                    schemas.SubTopicProgressOut(
                        id=sub.id,
                        category_id=sub.category_id,
                        topic_id=sub.topic_id,
                        name=sub.name,
                        order_index=sub.order_index,
                        icon_slug=sub.icon_slug,
                        prerequisite_subtopic_id=sub.prerequisite_subtopic_id,
                        is_completed=is_completed,
                        points_earned=points,
                        stars_awarded=stars,
                        is_unlocked=is_unlocked,
                        video_completed_count=comp_v,
                        total_videos_count=total_v,
                        is_video_completed=is_v_completed
                    )
                )

            topic_list.append(
                schemas.TopicRoadmapOut(
                    id=t.id,
                    name=t.name,
                    order_index=t.order_index,
                    subtopics=sub_progress_list
                )
            )

        result.append(
            schemas.CategoryRoadmapOut(
                id=cat.id,
                name=cat.name,
                description=cat.description,
                icon_slug=cat.icon_slug,
                grade_level=cat.grade_level,
                regional_board=cat.regional_board,
                topics=topic_list
            )
        )
    return result


# ─────────────────────────────────────────────────────────────────────────────
# EXAM START ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/start/subtopic/{subtopic_id}", response_model=List[schemas.QuestionOut])
def start_exam_by_subtopic(
    subtopic_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Delivers a randomized question set for a subtopic.
    Requires: active subscription + subtopic must be unlocked (prerequisite check).
    Strips correct answer flags and explanations to prevent cheating.
    """
    _subscription_gate(current_user)

    subtopic = db.query(models.SubTopic).filter(models.SubTopic.id == subtopic_id).first()
    if not subtopic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SubTopic not found")

    from app.utils.access import check_content_access
    if not check_content_access(current_user, subtopic.category.grade_level):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Package upgrade required"
        )

    # ── Prerequisite / lock-step enforcement ──────────────────────────────────
    # Find predecessor (same category, one lower order_index)
    predecessor = (
        db.query(models.SubTopic)
        .filter(
            models.SubTopic.category_id == subtopic.category_id,
            models.SubTopic.order_index < subtopic.order_index,
        )
        .order_by(models.SubTopic.order_index.desc())
        .first()
    )
    if predecessor:
        prog = db.query(models.StudentProgress).filter(
            models.StudentProgress.user_id == current_user.id,
            models.StudentProgress.subtopic_id == predecessor.id,
            models.StudentProgress.is_completed == True,
        ).first()
        if not prog:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Fadlan dhamaystir mawduuca horeba '{predecessor.name}' "
                    f"(Score >= 70%) ka hor inta aadan furin cutubkan."
                ),
            )

    # Deliver up to 20 randomized questions (correct flags stripped by schema)
    random_ids = [
        q_id for q_id, in
        approved_questions_query(db).with_entities(models.Question.id)
        .filter(
            models.Question.subtopic_id == subtopic_id
        )
        .order_by(func.random())
        .limit(20)
        .all()
    ]
    if not random_ids:
        return []

    questions = (
        db.query(models.Question)
        .filter(models.Question.id.in_(random_ids))
        .options(joinedload(models.Question.choices))
        .all()
    )
    return questions


@router.get("/start/weakness", response_model=List[schemas.QuestionOut])
def start_weakness_exam(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Delivers incorrect questions from the user's wrong answer notebook for retry.
    Requires active subscription.
    """
    _subscription_gate(current_user)
    records = (
        db.query(models.AnswerRecord)
        .join(models.ExamAttempt)
        .filter(
            models.ExamAttempt.user_id == current_user.id,
            models.AnswerRecord.is_correct == False
        )
        .options(joinedload(models.AnswerRecord.question).joinedload(models.Question.choices))
        .all()
    )
    
    seen_q_ids = set()
    questions = []
    for rec in records:
        q = rec.question
        if q and q.id not in seen_q_ids and len(questions) < 15:
            seen_q_ids.add(q.id)
            questions.append(q)
            
    return questions


@router.get("/start/{category_id}", response_model=List[schemas.QuestionOut])
def start_exam(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Legacy: delivers randomized questions for a category.
    Requires active subscription.
    """
    _subscription_gate(current_user)

    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    from app.utils.access import check_content_access
    if not check_content_access(current_user, category.grade_level):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Package upgrade required"
        )

    random_ids = [
        q_id for q_id, in
        approved_questions_query(db).with_entities(models.Question.id)
        .join(models.SubTopic)
        .filter(
            models.SubTopic.category_id == category_id
        )
        .order_by(func.random())
        .limit(20)
        .all()
    ]
    if not random_ids:
        return []

    questions = (
        db.query(models.Question)
        .filter(models.Question.id.in_(random_ids))
        .options(joinedload(models.Question.choices))
        .all()
    )
    return questions


# ─────────────────────────────────────────────────────────────────────────────
# EXAM SUBMISSION — XP ENGINE + STAR CALCULATOR + UNLOCK ENGINE
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/submit", response_model=schemas.ExamSubmitResponse)
def submit_exam(
    exam_in: schemas.ExamSubmit,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Grades submitted answers. On score >= 70%:
      - Awards 1/2/3 stars (SomPrep model)
      - Calculates difficulty-weighted XP
      - Updates user.total_xp_points and current_streak
      - Unlocks the next sequential subtopic node
      - Queues Coach Refik background analysis
    """
    # ── Resolve subtopic_id ───────────────────────────────────────────────────
    subtopic_id = exam_in.subtopic_id
    if not subtopic_id:
        if exam_in.answers:
            first_q = db.query(models.Question).filter(
                models.Question.id == exam_in.answers[0].question_id
            ).first()
            if first_q:
                subtopic_id = first_q.subtopic_id
        if not subtopic_id and exam_in.category_id:
            first_sub = (
                db.query(models.SubTopic)
                .filter(models.SubTopic.category_id == exam_in.category_id)
                .order_by(models.SubTopic.order_index)
                .first()
            )
            if first_sub:
                subtopic_id = first_sub.id

    if not subtopic_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mawduuca yar (subtopic) la xiriira imtixaankan lama helin.",
        )

    subtopic = db.query(models.SubTopic).filter(models.SubTopic.id == subtopic_id).first()
    if not subtopic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtopic not found")

    if not exam_in.answers:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No answers submitted")

    # ── Grade answers ─────────────────────────────────────────────────────────
    submitted_question_ids = [ans.question_id for ans in exam_in.answers]

    grade = grade_answers(db, exam_in.answers)
    correct_count = grade["correct_count"]
    wrong_count = grade["wrong_count"]
    wrong_question_ids = grade["wrong_question_ids"]
    total_count = len(exam_in.answers)
    score = grade["score"]

    # ── Generate AI insight from wrong questions ───────────────────────────────
    wrong_questions_objs = []
    if wrong_question_ids:
        wrong_questions_objs = (
            db.query(models.Question)
            .options(joinedload(models.Question.subtopic).joinedload(models.SubTopic.category))
            .filter(models.Question.id.in_(wrong_question_ids))
            .all()
        )
    ai_insight = generate_learning_insight(wrong_questions_objs)

    # ── Store attempt ─────────────────────────────────────────────────────────
    attempt = models.ExamAttempt(
        user_id=current_user.id,
        subtopic_id=subtopic_id,
        score=score,
        total_questions=total_count,
        correct_answers=correct_count,
        wrong_answers=wrong_count,
        ai_insight=ai_insight,
    )
    db.add(attempt)
    db.flush()

    for answer_row in grade["answer_rows"]:
        choice_record = db.query(models.Choice).filter(models.Choice.id == answer_row["chosen_choice_id"]).first()
        selected_text = choice_record.choice_text if choice_record else str(answer_row["chosen_choice_id"])
        db.add(models.AnswerRecord(
            attempt_id=attempt.id,
            question_id=answer_row["question_id"],
            selected_answer=selected_text,
            is_correct=answer_row["is_correct"],
            time_spent_seconds=15
        ))

    # ── Star & XP calculation (SomPrep model) ───────────────────────────
    stars = _calc_stars(score)
    is_completed = stars >= 1   # >=70% earns at least 1 star = completed

    # Fetch the submitted questions for XP difficulty weighting
    submitted_questions = (
        db.query(models.Question)
        .filter(models.Question.id.in_(submitted_question_ids))
        .all()
    )
    xp_earned = _calc_xp(correct_count, submitted_questions) if is_completed else 0
    points_earned = xp_earned  # Keep backward compat with points_earned field

    # ── Update StudentProgress ────────────────────────────────────────────────
    progress = db.query(models.StudentProgress).filter(
        models.StudentProgress.user_id == current_user.id,
        models.StudentProgress.subtopic_id == subtopic_id,
    ).first()

    if progress:
        # Only upgrade stars, never downgrade
        if stars > progress.stars_awarded:
            progress.stars_awarded = stars
        if is_completed:
            progress.is_completed = True
        if points_earned > progress.points_earned:
            progress.points_earned = points_earned
    else:
        progress = models.StudentProgress(
            user_id=current_user.id,
            subtopic_id=subtopic_id,
            is_completed=is_completed,
            points_earned=points_earned,
            stars_awarded=stars,
        )
        db.add(progress)

    # ── Update User XP + Streak ───────────────────────────────────────────────
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if user and xp_earned > 0:
        user.total_xp_points = (user.total_xp_points or 0) + xp_earned
        user.current_streak = (user.current_streak or 0) + 1

    db.commit()
    db.refresh(attempt)

    # ── Queue Coach Refik background analysis ─────────────────────────────────
    background_tasks.add_task(generate_coach_insight_background, current_user.id)

    # ── Return all subtopic questions with full data for Reflex Diagnostic Sheet ──
    all_questions = (
        db.query(models.Question)
        .filter(models.Question.subtopic_id == subtopic_id)
        .options(joinedload(models.Question.choices))
        .all()
    )

    return schemas.ExamSubmitResponse(
        score=score,
        correct_count=correct_count,
        wrong_count=wrong_count,
        points_earned=points_earned,
        xp_earned=xp_earned,
        stars_awarded=stars,
        attempt_id=attempt.id,
        questions=all_questions,
    )


# ─────────────────────────────────────────────────────────────────────────────
# EXAM HISTORY & REVIEW ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/attempts", response_model=List[schemas.ExamAttemptOut])
def get_exam_attempts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retrieve all exam attempts for the authenticated student, newest first."""
    return (
        db.query(models.ExamAttempt)
        .filter(models.ExamAttempt.user_id == current_user.id)
        .options(
            joinedload(models.ExamAttempt.subtopic).joinedload(models.SubTopic.category)
        )
        .order_by(models.ExamAttempt.completed_at.desc())
        .all()
    )


@router.get("/attempt/{attempt_id}", response_model=schemas.ExamAttemptOut)
def get_exam_attempt_detail(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retrieve a specific exam attempt. Enforces ownership check."""
    attempt = (
        db.query(models.ExamAttempt)
        .filter(
            models.ExamAttempt.id == attempt_id,
            models.ExamAttempt.user_id == current_user.id,
        )
        .options(
            joinedload(models.ExamAttempt.subtopic).joinedload(models.SubTopic.category)
        )
        .first()
    )
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam attempt not found or unauthorized access.",
        )
    return attempt


@router.get("/wrong-answers")
def get_wrong_answers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns all questions that the student answered incorrectly, along with
    meta details (subject, topic, explanation, selected answer) to render the Wrong Answer Notebook.
    """
    records = (
        db.query(models.AnswerRecord)
        .join(models.ExamAttempt)
        .filter(
            models.ExamAttempt.user_id == current_user.id,
            models.AnswerRecord.is_correct == False
        )
        .options(
            joinedload(models.AnswerRecord.question).joinedload(models.Question.choices),
            joinedload(models.AnswerRecord.question).joinedload(models.Question.subtopic).joinedload(models.SubTopic.category)
        )
        .all()
    )

    result = []
    seen_q_ids = set()
    for rec in records:
        q = rec.question
        if not q or q.id in seen_q_ids:
            continue
        seen_q_ids.add(q.id)

        correct_choice = next((c.choice_text for c in q.choices if c.is_correct), "Unknown")

        result.append({
            "question_id": q.id,
            "question_text": q.question_text,
            "choices": [{"id": c.id, "choice_text": c.choice_text} for c in q.choices],
            "correct_answer": correct_choice,
            "explanation": q.explanation_text,
            "difficulty": q.difficulty_level,
            "selected_answer": rec.selected_answer,
            "topic_name": q.subtopic.name if q.subtopic else "General",
            "subject_name": q.subtopic.category.name if q.subtopic and q.subtopic.category else "General"
        })
    
    return result


@router.get("/review/{attempt_id}", response_model=List[schemas.QuestionFullOut])
def get_exam_review(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns all questions (with choices + reflex_step_title) for post-exam
    Reflex Diagnostic Sheet rendering. Ownership enforced.
    """
    attempt = (
        db.query(models.ExamAttempt)
        .filter(
            models.ExamAttempt.id == attempt_id,
            models.ExamAttempt.user_id == current_user.id,
        )
        .first()
    )
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam attempt not found or unauthorized access.",
        )

    questions_query = db.query(models.Question).options(joinedload(models.Question.choices))
    if attempt.mock_exam_id:
        questions_query = questions_query.filter(models.Question.mock_exam_id == attempt.mock_exam_id)
    else:
        questions_query = questions_query.filter(models.Question.subtopic_id == attempt.subtopic_id)

    questions = questions_query.all()
    return questions


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN / TEACHER QUESTION MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/questions", response_model=List[schemas.QuestionFullOut])
def get_all_questions(
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(require_role(["admin", "teacher"])),
):
    """Retrieve all questions with full data. Admin/teacher only."""
    return (
        db.query(models.Question)
        .options(joinedload(models.Question.choices))
        .all()
    )


@router.post("/questions", response_model=schemas.QuestionFullOut, status_code=status.HTTP_201_CREATED)
def create_question(
    question_in: schemas.QuestionCreate,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(require_role(["admin", "teacher"])),
):
    """Create a question with choices and optional reflex step title. Admin/teacher only."""
    subtopic = db.query(models.SubTopic).filter(models.SubTopic.id == question_in.subtopic_id).first()
    if not subtopic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mawduuca yar (subtopic) la doortay laguma helin keydka macluumaadka.",
        )

    new_question = models.Question(
        subtopic_id=question_in.subtopic_id,
        question_text=question_in.question_text,
        explanation_text=question_in.explanation_text,
        explanation_video_url=question_in.explanation_video_url,
        difficulty_level=question_in.difficulty_level,
        reflex_step_title=question_in.reflex_step_title,
    )
    db.add(new_question)
    db.commit()
    db.refresh(new_question)

    for choice_data in question_in.choices:
        db.add(models.Choice(
            question_id=new_question.id,
            choice_text=choice_data.choice_text,
            is_correct=choice_data.is_correct,
        ))

    db.commit()
    db.refresh(new_question)
    return new_question


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(require_role(["admin", "teacher"])),
):
    """Delete a question and its cascading choices. Admin/teacher only."""
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Su'aasha la codsaday in la tiro laguma helin keydka.",
        )
    db.delete(question)
    db.commit()
    return


# ─────────────────────────────────────────────────────────────────────────────
# MOCK EXAM & DIAGNOSTIC ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/mock-exams", response_model=List[schemas.MockExamOut])
def get_mock_exams(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch available mock exams matching student's grade and regional board."""
    return db.query(models.MockExam).filter(
        models.MockExam.grade_level == current_user.grade_level,
        models.MockExam.regional_board == current_user.selected_region
    ).all()


@router.get("/mock-exams/{mock_exam_id}/start", response_model=List[schemas.QuestionOut])
def start_mock_exam(
    mock_exam_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delivers all approved questions linked to a mock exam."""
    _subscription_gate(current_user)
    mock_exam = db.query(models.MockExam).filter(models.MockExam.id == mock_exam_id).first()
    if not mock_exam:
        raise HTTPException(status_code=404, detail="Mock Exam not found")
    
    from app.utils.access import check_content_access
    if not check_content_access(current_user, mock_exam.grade_level):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Package upgrade required"
        )
    
    questions = approved_questions_query(db).filter(
        models.Question.mock_exam_id == mock_exam_id
    ).options(joinedload(models.Question.choices)).all()
    return questions


@router.post("/mock-exams/{mock_exam_id}/submit", response_model=schemas.ExamSubmitResponse)
def submit_mock_exam(
    mock_exam_id: int,
    submit_in: schemas.MockExamSubmit,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Grades a mock exam and stores a full ExamAttempt log."""
    mock_exam = db.query(models.MockExam).filter(models.MockExam.id == mock_exam_id).first()
    if not mock_exam:
        raise HTTPException(status_code=404, detail="Mock Exam not found")
    
    from app.utils.access import check_content_access
    if not check_content_access(current_user, mock_exam.grade_level):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Package upgrade required"
        )
    
    if not submit_in.answers:
        raise HTTPException(status_code=400, detail="No answers submitted")

    submitted_question_ids = [ans.question_id for ans in submit_in.answers]
    
    grade = grade_answers(db, submit_in.answers)
    correct_count = grade["correct_count"]
    wrong_count = grade["wrong_count"]
    wrong_question_ids = grade["wrong_question_ids"]
    total_count = len(submit_in.answers)
    score = grade["score"]

    wrong_objs = []
    if wrong_question_ids:
        wrong_objs = db.query(models.Question).filter(
            models.Question.id.in_(wrong_question_ids)
        ).all()
    ai_insight = generate_learning_insight(wrong_objs)

    attempt = models.ExamAttempt(
        user_id=current_user.id,
        mock_exam_id=mock_exam_id,
        subtopic_id=None,
        score=score,
        total_questions=total_count,
        correct_answers=correct_count,
        wrong_answers=wrong_count,
        time_spent_seconds=submit_in.time_spent_seconds,
        ai_insight=ai_insight
    )
    db.add(attempt)
    db.flush()

    for answer_row in grade["answer_rows"]:
        choice_record = db.query(models.Choice).filter(models.Choice.id == answer_row["chosen_choice_id"]).first()
        selected_text = choice_record.choice_text if choice_record else str(answer_row["chosen_choice_id"])
        db.add(models.AnswerRecord(
            attempt_id=attempt.id,
            question_id=answer_row["question_id"],
            selected_answer=selected_text,
            is_correct=answer_row["is_correct"],
            time_spent_seconds=int(submit_in.time_spent_seconds / total_count) if total_count > 0 else 0
        ))

    all_questions = db.query(models.Question).filter(models.Question.id.in_(submitted_question_ids)).all()
    xp_earned = _calc_xp(correct_count, all_questions)

    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if user and xp_earned > 0:
        user.total_xp_points = (user.total_xp_points or 0) + xp_earned
        user.current_streak = (user.current_streak or 0) + 1

    db.commit()
    db.refresh(attempt)

    background_tasks.add_task(generate_coach_insight_background, current_user.id)

    mock_questions = db.query(models.Question).filter(
        models.Question.mock_exam_id == mock_exam_id
    ).options(joinedload(models.Question.choices)).all()

    return schemas.ExamSubmitResponse(
        score=score,
        correct_count=correct_count,
        wrong_count=wrong_count,
        points_earned=xp_earned,
        xp_earned=xp_earned,
        stars_awarded=0,
        attempt_id=attempt.id,
        questions=mock_questions
    )


@router.get("/readiness")
def get_readiness_score(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Computes a dynamic Readiness Score (0-100%) for the unified final examinations."""
    return calculate_readiness(db, current_user)


@router.get("/diagnostic/{attempt_id}")
def get_diagnostic_report(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Generates a detailed diagnostic report for an attempt."""
    attempt = db.query(models.ExamAttempt).filter(
        models.ExamAttempt.id == attempt_id,
        models.ExamAttempt.user_id == current_user.id
    ).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="Exam attempt not found")

    subject_name = "General"
    category_id = None
    subtopic_id = attempt.subtopic_id

    if subtopic_id:
        subtopic = db.query(models.SubTopic).options(joinedload(models.SubTopic.category)).filter(
            models.SubTopic.id == subtopic_id
        ).first()
        if subtopic and subtopic.category:
            subject_name = subtopic.category.name
            category_id = subtopic.category_id

    elif attempt.mock_exam_id:
        mock_exam = db.query(models.MockExam).filter(models.MockExam.id == attempt.mock_exam_id).first()
        if mock_exam:
            subject_name = f"Mock: {mock_exam.title}"

    weakness_grid = []
    remediation_lessons = []
    if category_id:
        subtopics = db.query(models.SubTopic).filter(models.SubTopic.category_id == category_id).all()
        for sub in subtopics:
            prog = db.query(models.StudentProgress).filter(
                models.StudentProgress.user_id == current_user.id,
                models.StudentProgress.subtopic_id == sub.id
            ).first()
            score_record = db.query(models.ExamAttempt).filter(
                models.ExamAttempt.user_id == current_user.id,
                models.ExamAttempt.subtopic_id == sub.id
            ).order_by(models.ExamAttempt.completed_at.desc()).first()

            current_score = score_record.score if score_record else 0.0
            is_comp = prog.is_completed if prog else False

            if not is_comp or current_score < 70.0:
                weakness_grid.append({
                    "subtopic_id": sub.id,
                    "name": sub.name,
                    "score": round(current_score, 1),
                    "status": "Weak" if score_record else "Not Attempted"
                })
                video = db.query(models.VideoLesson).filter(models.VideoLesson.subtopic_id == sub.id).first()
                if video:
                    remediation_lessons.append({
                        "subtopic_id": sub.id,
                        "subtopic_name": sub.name,
                        "video_id": video.id,
                        "video_title": video.title
                    })

    total_time = attempt.time_spent_seconds
    total_qs = attempt.total_questions
    time_per_q = total_time / total_qs if total_qs > 0 else 0
    
    if time_per_q <= 75:
        time_status = "Efficient"
        time_tip = "Waad ku fiican tahay maamulka waqtiga. Sii wad xawaarahan!"
    elif time_per_q <= 120:
        time_status = "Average"
        time_tip = "Fadlan kordhi xawaarahaaga si aad u hesho waqti dheeri ah su'aalaha adag."
    else:
        time_status = "Slow"
        time_tip = "Waxaad ku qaadataa su'aalaha waqti aad u dheer. Baro farsamooyinka reer-doping si aad u xalliso su'aalaha si degdeg ah."

    repeated_mistakes = []
    if subtopic_id:
        questions = db.query(models.Question).filter(models.Question.subtopic_id == subtopic_id).all()
        for q in questions:
            if q.reflex_step_title:
                repeated_mistakes.append({
                    "question_id": q.id,
                    "question_text": q.question_text[:120] + "...",
                    "reflex_step_title": q.reflex_step_title,
                    "difficulty_level": q.difficulty_level
                })

    return {
        "attempt_id": attempt.id,
        "score": attempt.score,
        "correct_answers": attempt.correct_answers,
        "wrong_answers": attempt.wrong_answers,
        "subject_name": subject_name,
        "weakness_grid": weakness_grid[:5],
        "remediation_lessons": remediation_lessons[:3],
        "time_management": {
            "time_spent_seconds": total_time,
            "average_seconds_per_question": round(time_per_q, 1),
            "status": time_status,
            "tip": time_tip
        },
        "repeated_mistakes": repeated_mistakes
    }
