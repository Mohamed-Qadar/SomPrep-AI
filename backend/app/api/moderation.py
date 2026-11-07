import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.api.auth import require_role
from app.api.community import ensure_default_blocked_words
from app.database import get_db
from app.utils.audit import log_admin_action

router = APIRouter(prefix="/api/admin/moderation", tags=["Admin Moderation"])


@router.get("/reports", response_model=List[schemas.ReportedMessageOut if hasattr(schemas, "ReportedMessageOut") else schemas.ModerationReportOut])
def get_reported_messages(
    db: Session = Depends(get_db),
    moderator: models.User = Depends(require_role(["admin", "teacher"])),
):
    """
    List all reported messages that need review.
    """
    reports = db.query(models.ReportedMessage).filter(
        models.ReportedMessage.status == "pending"
    ).order_by(models.ReportedMessage.created_at.desc()).all()
    
    result = []
    for rep in reports:
        result.append(
            schemas.ModerationReportOut(
                id=rep.id,
                message_id=rep.message_id,
                message_sender_id=rep.message.sender_id if rep.message else None,
                message_content=rep.message.content if rep.message else "[Laga masaxay / Deleted]",
                message_sender_name=rep.message.sender.full_name if (rep.message and rep.message.sender) else "[Unknown]",
                reported_by_name=rep.reporter.full_name if rep.reporter else "[Unknown]",
                reason=rep.reason,
                created_at=rep.created_at,
                status=rep.status
            )
        )
    return result


@router.post("/reports/{report_id}/resolve")
def resolve_report(
    report_id: int,
    req: schemas.ModerationActionRequest,
    request: Request,
    db: Session = Depends(get_db),
    moderator: models.User = Depends(require_role(["admin", "teacher"])),
):
    """
    Take moderation action on a report.
    Actions: 'delete_message', 'mute_user', 'ban_user', or 'dismiss'.
    """
    report = db.query(models.ReportedMessage).filter(models.ReportedMessage.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Moderation report not found."
        )
        
    msg = db.query(models.ChatMessage).filter(models.ChatMessage.id == report.message_id).first()
    
    if req.action == "delete_message":
        if msg:
            msg.content = "[Farriintan waa laga saaray sababo la xiriira xeerka madasha / This message was removed due to community guidelines violations]"
            msg.is_moderated = True
            msg.is_reported = False
        report.status = "resolved"

    elif req.action == "mute_user":
        if msg and msg.sender:
            user = db.query(models.User).filter(models.User.id == msg.sender_id).first()
            if user:
                user.muted_until = (
                    datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
                    + datetime.timedelta(hours=req.mute_hours)
                )
            msg.content = "[Farriintan waa laga saaray, isticmaalahana si ku meel gaar ah ayaa loo aamusiyey / Message removed and user temporarily muted]"
            msg.is_moderated = True
            msg.is_reported = False
        report.status = "resolved"
        
    elif req.action == "ban_user":
        if msg and msg.sender:
            user = db.query(models.User).filter(models.User.id == msg.sender_id).first()
            if user:
                user.is_active = False # Ban student
            # Clean up message
            msg.content = "[Isticmaalahan waa laga mamnuucay madasha / This user has been banned from the platform]"
            msg.is_moderated = True
            msg.is_reported = False
        report.status = "resolved"
        
    elif req.action == "dismiss":
        if msg:
            msg.is_reported = False
        report.status = "dismissed"

    log_admin_action(
        db,
        admin=moderator,
        action_type=f"moderation_{req.action}",
        request=request,
        target_type="chat_message",
        target_id=report.message_id,
        new_value={
            "report_id": report.id,
            "offender_id": msg.sender_id if msg else None,
            "mute_hours": req.mute_hours if req.action == "mute_user" else None,
        },
    )
    db.commit()
    return {"message": f"Report successfully resolved with action: {req.action}"}


@router.delete("/questions/{question_id}")
def delete_community_question(
    question_id: int,
    request: Request,
    db: Session = Depends(get_db),
    moderator: models.User = Depends(require_role(["admin", "teacher"])),
):
    """
    Remove an inappropriate community Q&A question (and its replies).
    """
    question = db.query(models.CommunityQuestion).filter(
        models.CommunityQuestion.id == question_id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Community question not found.")

    log_admin_action(
        db,
        admin=moderator,
        action_type="moderation_delete_question",
        request=request,
        target_type="community_question",
        target_id=question.id,
        old_value={"author_id": question.user_id, "text": (question.title or "")[:200]},
    )
    db.delete(question)
    db.commit()
    return {"message": "Community question removed."}


@router.delete("/replies/{reply_id}")
def delete_community_reply(
    reply_id: int,
    request: Request,
    db: Session = Depends(get_db),
    moderator: models.User = Depends(require_role(["admin", "teacher"])),
):
    """
    Remove an inappropriate reply from the community Q&A.
    """
    reply = db.query(models.CommunityQuestionReply).filter(
        models.CommunityQuestionReply.id == reply_id
    ).first()
    if not reply:
        raise HTTPException(status_code=404, detail="Community reply not found.")

    log_admin_action(
        db,
        admin=moderator,
        action_type="moderation_delete_reply",
        request=request,
        target_type="community_reply",
        target_id=reply.id,
        old_value={"author_id": reply.user_id, "text": (reply.content or "")[:200]},
    )
    db.delete(reply)
    db.commit()
    return {"message": "Community reply removed."}


@router.get("/blocked-words", response_model=List[schemas.BlockedWordOut])
def list_blocked_words(
    db: Session = Depends(get_db),
    moderator: models.User = Depends(require_role(["admin", "teacher"])),
):
    ensure_default_blocked_words(db)
    return db.query(models.BlockedWord).order_by(models.BlockedWord.word.asc()).all()


@router.post("/blocked-words", response_model=schemas.BlockedWordOut)
def create_blocked_word(
    payload: schemas.BlockedWordCreate,
    db: Session = Depends(get_db),
    moderator: models.User = Depends(require_role(["admin"])),
):
    word = payload.word.strip().lower()
    if not word:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Blocked word is required.")

    existing = db.query(models.BlockedWord).filter(models.BlockedWord.word == word).first()
    if existing:
        existing.is_active = True
        if payload.language is not None:
            existing.language = payload.language
        db.commit()
        db.refresh(existing)
        return existing

    blocked = models.BlockedWord(
        word=word,
        language=payload.language,
        is_active=True,
        created_by_id=moderator.id,
    )
    db.add(blocked)
    db.commit()
    db.refresh(blocked)
    return blocked


@router.patch("/blocked-words/{word_id}/toggle", response_model=schemas.BlockedWordOut)
def toggle_blocked_word(
    word_id: int,
    db: Session = Depends(get_db),
    moderator: models.User = Depends(require_role(["admin"])),
):
    blocked = db.query(models.BlockedWord).filter(models.BlockedWord.id == word_id).first()
    if not blocked:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blocked word not found.")
    blocked.is_active = not blocked.is_active
    db.commit()
    db.refresh(blocked)
    return blocked


@router.delete("/blocked-words/{word_id}")
def delete_blocked_word(
    word_id: int,
    db: Session = Depends(get_db),
    moderator: models.User = Depends(require_role(["admin"])),
):
    blocked = db.query(models.BlockedWord).filter(models.BlockedWord.id == word_id).first()
    if not blocked:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blocked word not found.")
    db.delete(blocked)
    db.commit()
    return {"message": "Blocked word deleted."}
