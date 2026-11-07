from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.api.auth import get_current_user
from app.database import get_db
from app.services.ai_engine import generate_coach_insight
from app.utils.access import require_active_subscription

router = APIRouter(prefix="/api/ai_coach", tags=["AI Coach"])

# AI Coach is a PREMIUM feature. Both endpoints require an active subscription
# (admins/teachers bypass automatically via require_active_subscription).


@router.get("/brief", response_model=schemas.AICoachLogOut)
def get_coach_brief(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    """
    Retrieves the latest AI Coach diagnostic message log for the logged-in student.
    If no log exists, triggers generation dynamically.
    """
    log = (
        db.query(models.AICoachLog)
        .filter(models.AICoachLog.user_id == current_user.id)
        .order_by(models.AICoachLog.created_at.desc())
        .first()
    )

    if not log:
        # Generate initial coach insight dynamically
        log = generate_coach_insight(db, current_user.id)

    return log


@router.post("/analyze", response_model=schemas.AICoachLogOut)
def force_coach_analysis(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    """
    Forces a real-time recalculation of the student's progress history
    and logs an updated diagnostic analysis report.
    """
    log = generate_coach_insight(db, current_user.id)
    return log
