from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app import models, schemas
from app.api.auth import require_role
from app.database import get_db
from app.services.exam_logic import REVIEW_STATUSES

router = APIRouter(prefix="/api/reviewer", tags=["Content Reviewer Portal"])


@router.get("/pending", response_model=List[schemas.QuestionFullOut])
def get_pending_questions(
    db: Session = Depends(get_db),
    reviewer: models.User = Depends(require_role(["admin", "teacher", "reviewer"])),
):
    """
    Retrieve all questions pending academic review.
    Accessible only to reviewers, teachers, and administrators.
    """
    return (
        db.query(models.Question)
        .options(joinedload(models.Question.choices))
        .filter(models.Question.review_status == "pending_review")
        .all()
    )


@router.post("/questions/{question_id}/review", response_model=schemas.QuestionFullOut)
def review_question(
    question_id: int,
    review_in: schemas.QuestionReviewRequest,
    db: Session = Depends(get_db),
    reviewer: models.User = Depends(require_role(["admin", "teacher", "reviewer"])),
):
    """
    Approve or reject a question draft.
    Transition review_status to 'approved' or 'rejected'.
    """
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Su'aasha la codsaday laguma helin keydka macluumaadka.",
        )

    if review_in.status not in REVIEW_STATUSES - {"draft", "pending_review"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review status must be 'approved' or 'rejected'.",
        )

    question.review_status = review_in.status
    question.reviewer_id = reviewer.id
    
    # If rejected, we append reviewer notes or reason to the explanation text for editors
    if review_in.status == "rejected" and review_in.rejection_reason:
        question.explanation_text = f"[REJECTED BY REVIEWER: {review_in.rejection_reason}]\n" + (question.explanation_text or "")
        
    db.commit()
    db.refresh(question)
    return question


@router.post("/questions/{question_id}/ai-assist", response_model=schemas.QuestionFullOut)
def ai_assist_explanation(
    question_id: int,
    db: Session = Depends(get_db),
    reviewer: models.User = Depends(require_role(["admin", "teacher", "reviewer"])),
):
    """
    AI-powered utility to automatically draft explanation text and Reflex solutions
    for a question, accelerating the human review queue.
    """
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )

    # Determine Reflex solutions based on question topic
    text = (question.question_text or "").lower()
    
    reflex_som = "Khariidada Refleksiga (Reflex Steps):\n"
    reflex_eng = "Reflex Mapping Steps:\n"
    
    # Simple semantic heuristics matching curriculum topics
    if "isla'eg" in text or "solve" in text or "equation" in text or "x" in text:
        reflex_som += "• Refleks 1: Aqoonso nooca isla'egta (Identify Equation Type)\n• Refleks 2: Isku keen dhinacyada isku midka ah (Isolate Variables)\n• Refleks 3: Xalliso oo hubi qiimaha x (Solve & Validate)"
        reflex_eng += "• Reflex 1: Identify Equation Type\n• Reflex 2: Isolate Variables\n• Reflex 3: Solve & Validate"
        reflex_title = "Refleks 1: Aqoonso Nooca Isla'egta -> Refleks 2: Isku keen dhinacyada isku midka ah -> Refleks 3: Xalliso"
    elif "triangle" in text or "circle" in text or "angle" in text or "xagal" in text:
        reflex_som += "• Refleks 1: Sawir ama arag qaabka hendesada (Visualize Geometry Structure)\n• Refleks 2: Adeegso formula-ta ku habboon (Apply Geometric Formula)\n• Refleks 3: Xisaabi baaxada ama xagalka (Calculate Solution)"
        reflex_eng += "• Reflex 1: Visualize Geometry Structure\n• Reflex 2: Apply Geometric Formula\n• Reflex 3: Calculate Solution"
        reflex_title = "Refleks 1: Sawir qaabka hendesada -> Refleks 2: Adeegso formula-ta -> Refleks 3: Xisaabi"
    elif "force" in text or "motion" in text or "newton" in text or "xoog" in text:
        reflex_som += "• Refleks 1: Aqoonso xoogaga shaqaynaya (Identify Forces)\n• Refleks 2: Adeegso sharciga Newton (Apply Newton's Law F=ma)\n• Refleks 3: Soo saar dardargelinta ama cufka (Solve for Unknown)"
        reflex_eng += "• Reflex 1: Identify Forces\n• Reflex 2: Apply Newton's Law (F=ma)\n• Reflex 3: Solve for Unknown"
        reflex_title = "Refleks 1: Aqoonso xoogaga -> Refleks 2: Adeegso sharciga Newton -> Refleks 3: Soo saar"
    else:
        reflex_som += "• Refleks 1: Akhriso su'aasha si taxaddar leh (Read Carefully)\n• Refleks 2: Ka saar doorashooyinka khaldan (Eliminate Distractors)\n• Refleks 3: Dooro jawaabta saxda ah (Select Best Answer)"
        reflex_eng += "• Reflex 1: Read Carefully\n• Reflex 2: Eliminate Distractors\n• Reflex 3: Select Best Answer"
        reflex_title = "Refleks 1: Akhriso su'aasha -> Refleks 2: Ka saar kuwa khaldan -> Refleks 3: Dooro saxda"

    # Find the correct choice text for explanation assistance
    correct_choice = db.query(models.Choice).filter(
        models.Choice.question_id == question.id,
        models.Choice.is_correct == True
    ).first()
    correct_text = correct_choice.choice_text if correct_choice else "Jawaabta saxda ah"

    ai_explanation = (
        "=== SHARRAXAADA AI (AI EXPLANATION) ===\n\n"
        f"Jawaabta Saxda ah waa: {correct_text}\n\n"
        "SHARRAXAAD KOBOCSAN (DETAILED EXPLANATION):\n"
        f"Su'aashan waxay u baahan tahay in la raaco tallaabooyinka soo socda si loo xalliyo:\n"
        f"{reflex_som}\n\n"
        "-----------------------------------------\n"
        "ENGLISH EXPLANATION:\n"
        f"The correct option is: {correct_text}\n"
        f"Follow these logical steps to resolve the question:\n"
        f"{reflex_eng}"
    )

    question.explanation_text = ai_explanation
    question.reflex_step_title = reflex_title
    
    db.commit()
    db.refresh(question)
    return question
