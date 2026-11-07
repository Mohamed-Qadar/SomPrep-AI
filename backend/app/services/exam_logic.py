from sqlalchemy.orm import Session, joinedload

from app import models

REVIEW_STATUSES = {"draft", "pending_review", "approved", "rejected"}
APPROVED_REVIEW_STATUS = "approved"


def approved_questions_query(db: Session):
    return db.query(models.Question).filter(
        models.Question.review_status == APPROVED_REVIEW_STATUS
    )


def grade_answers(db: Session, answers):
    question_ids = [answer.question_id for answer in answers]
    correct_choices = (
        db.query(models.Choice)
        .filter(
            models.Choice.question_id.in_(question_ids),
            models.Choice.is_correct == True,
        )
        .all()
    )
    correct_choice_by_question = {choice.question_id: choice for choice in correct_choices}

    correct_count = 0
    wrong_question_ids = []
    answer_rows = []

    for answer in answers:
        correct_choice = correct_choice_by_question.get(answer.question_id)
        is_correct = bool(correct_choice and correct_choice.id == answer.chosen_choice_id)
        if is_correct:
            correct_count += 1
        else:
            wrong_question_ids.append(answer.question_id)

        answer_rows.append(
            {
                "question_id": answer.question_id,
                "chosen_choice_id": answer.chosen_choice_id,
                "is_correct": is_correct,
            }
        )

    total_count = len(answers)
    wrong_count = total_count - correct_count
    score = (correct_count / total_count * 100) if total_count else 0.0

    return {
        "question_ids": question_ids,
        "correct_count": correct_count,
        "wrong_count": wrong_count,
        "wrong_question_ids": wrong_question_ids,
        "score": score,
        "answer_rows": answer_rows,
    }


def calculate_readiness(db: Session, user: models.User):
    total_subtopics = (
        db.query(models.SubTopic)
        .join(models.Category)
        .filter(
            models.Category.grade_level == user.grade_level,
            (models.Category.regional_board == "All")
            | (models.Category.regional_board == user.selected_region),
        )
        .count()
    )

    completed_subtopics = (
        db.query(models.StudentProgress)
        .join(models.SubTopic)
        .join(models.Category)
        .filter(
            models.StudentProgress.user_id == user.id,
            models.StudentProgress.is_completed == True,
            models.Category.grade_level == user.grade_level,
            (models.Category.regional_board == "All")
            | (models.Category.regional_board == user.selected_region),
        )
        .count()
    )

    syllabus_progress = (
        completed_subtopics / total_subtopics * 100 if total_subtopics > 0 else 0.0
    )

    mock_attempts = (
        db.query(models.ExamAttempt)
        .filter(
            models.ExamAttempt.user_id == user.id,
            models.ExamAttempt.mock_exam_id != None,
        )
        .all()
    )
    mock_exams_taken = len(mock_attempts)
    mock_average = (
        sum(attempt.score for attempt in mock_attempts) / mock_exams_taken
        if mock_exams_taken
        else 0.0
    )

    streak_bonus = min(5.0, (user.current_streak or 0) * 0.5)
    readiness_score = (syllabus_progress * 0.6) + (mock_average * 0.4) + streak_bonus
    readiness_score = max(0.0, min(100.0, readiness_score))

    return {
        "readiness_score": round(readiness_score, 1),
        "syllabus_progress": round(syllabus_progress, 1),
        "mock_average": round(mock_average, 1),
        "total_subtopics": total_subtopics,
        "completed_subtopics": completed_subtopics,
        "mock_exams_taken": mock_exams_taken,
        "insufficient_data": mock_exams_taken == 0 and completed_subtopics == 0,
    }


def question_with_choices(query):
    return query.options(joinedload(models.Question.choices))
