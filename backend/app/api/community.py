import datetime
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import or_, and_, func
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import settings
from app.database import get_db
from app.utils.access import get_allowed_grades, get_user_allowed_grades, require_active_subscription
from app.services.ai_engine import generate_community_ai_response
from app.services import community_media
from app.utils.rate_limit import rate_limit

router = APIRouter(prefix="/api/community", tags=["Community"])


def _room_grade_allowed(room: models.ChatRoom, user: models.User) -> bool:
    if user.role in ("admin", "teacher"):
        return True
    if room.type not in ("class", "subject"):
        return True
    allowed = set(get_user_allowed_grades(user))
    if not allowed:
        return False
    if room.grade_min is None or room.grade_max is None:
        return False
    room_grades = set(range(room.grade_min, room.grade_max + 1))
    return bool(allowed.intersection(room_grades))


def _same_package_band(user_a: models.User, user_b: models.User) -> bool:
    if user_a.role in ("admin", "teacher") or user_b.role in ("admin", "teacher"):
        return True
    a = set(get_user_allowed_grades(user_a))
    b = set(get_user_allowed_grades(user_b))
    return bool(a and b and a.intersection(b))

# ─────────────────────────────────────────────────────────────────────────────
# SAFETY & MODERATION: PROFANITY FILTER
# ─────────────────────────────────────────────────────────────────────────────

DEFAULT_BLOCKED_WORDS = {
    # English
    "fuck", "shit", "bitch", "asshole", "bastard", "dick", "cunt", "pussy", "dumbass", "wanker",
    # Somali
    "was", "wasa", "waso", "wasaya", "wasaye", "siil", "gus", "kintir", "futada", "dabo", "daba",
    "qooq", "qooqan", "igoordheere", "dhillo", "dhilo", "naas", "husi", "nacas", "doqon", "wasmo", "wasma"
}


def ensure_default_blocked_words(db: Session):
    """Seed the DB-managed moderation dictionary on first use."""
    if db.query(models.BlockedWord.id).first():
        return
    for word in sorted(DEFAULT_BLOCKED_WORDS):
        db.add(models.BlockedWord(word=word, language=None, is_active=True))
    db.commit()


# -----------------------------------------------------------------------------
# MEDIA UPLOAD ENDPOINTS
# -----------------------------------------------------------------------------

@router.post(
    "/media/upload",
    response_model=schemas.CommunityMediaUploadOut,
    dependencies=[Depends(rate_limit("community_media_upload", max_calls=20, window_seconds=60))],
)
async def upload_community_media(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    """
    Upload a real screenshot/image for community chat or homework Q&A.
    Stores only an opaque media URL in chat/question rows.
    """
    ensure_not_muted(current_user)
    max_bytes = int(settings.MAX_COMMUNITY_MEDIA_SIZE_MB * 1024 * 1024)
    blob = await file.read(max_bytes + 1)
    if not blob:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded image is empty.",
        )
    if len(blob) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image must be under {settings.MAX_COMMUNITY_MEDIA_SIZE_MB:.0f}MB.",
        )

    ext = community_media.sniff_image_extension(file.content_type, blob)
    if ext is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image type. Upload PNG, JPG, or WEBP.",
        )

    try:
        file_key = community_media.save_media(blob, ext)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not store image. Please try again.",
        ) from exc

    media = models.CommunityMedia(
        file_key=file_key,
        uploaded_by_id=current_user.id,
        original_filename=file.filename,
        content_type=community_media.content_type_for_key(file_key),
        size_bytes=len(blob),
    )
    db.add(media)
    db.commit()

    return schemas.CommunityMediaUploadOut(
        file_key=file_key,
        media_url=f"/api/community/media/{file_key}",
        content_type=media.content_type,
        size_bytes=media.size_bytes,
    )


@router.get("/media/{file_key}")
def get_community_media(
    file_key: str,
    current_user: models.User = Depends(require_active_subscription),
):
    path = community_media.media_path(file_key)
    if path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found.")
    return FileResponse(path, media_type=community_media.content_type_for_key(file_key))


def get_active_blocked_words(db: Optional[Session] = None) -> set[str]:
    if db is None:
        return set(DEFAULT_BLOCKED_WORDS)
    ensure_default_blocked_words(db)
    rows = db.query(models.BlockedWord.word).filter(
        models.BlockedWord.is_active == True
    ).all()
    return {row[0].lower() for row in rows}


def contains_profanity(text: str, db: Optional[Session] = None) -> bool:
    """Checks text against the DB-managed blocked-word dictionary."""
    cleaned = re.sub(r"[^\w\s]", "", text.lower())
    words = cleaned.split()
    blocked_words = get_active_blocked_words(db)
    for w in words:
        if w in blocked_words:
            return True
    return False


def _utcnow_naive() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


def ensure_not_muted(user: models.User):
    if user.muted_until and user.muted_until > _utcnow_naive():
        until = user.muted_until.isoformat(timespec="minutes")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your community posting access is muted until {until}.",
        )


def is_room_member(db: Session, room_id: int, user_id: int) -> bool:
    return db.query(models.ChatRoomMember.id).filter(
        models.ChatRoomMember.room_id == room_id,
        models.ChatRoomMember.user_id == user_id,
    ).first() is not None


def require_room_access(db: Session, room: models.ChatRoom, user: models.User):
    if room.type in ("class", "subject"):
        if not _room_grade_allowed(room, user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This room is outside your active package.",
            )
        return
    if not is_room_member(db, room.id, user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this private conversation.",
        )


def get_room_member_ids(db: Session, room_id: int) -> list[int]:
    rows = db.query(models.ChatRoomMember.user_id).filter(
        models.ChatRoomMember.room_id == room_id
    ).all()
    return [row[0] for row in rows]


def users_have_block_between(db: Session, user_a: int, user_b: int) -> bool:
    return db.query(models.BlockedUser.id).filter(
        or_(
            and_(models.BlockedUser.blocker_id == user_a, models.BlockedUser.blocked_id == user_b),
            and_(models.BlockedUser.blocker_id == user_b, models.BlockedUser.blocked_id == user_a),
        )
    ).first() is not None


# ─────────────────────────────────────────────────────────────────────────────
# SEED DEFAULT CHANNELS HELPER
# ─────────────────────────────────────────────────────────────────────────────

def ensure_default_rooms(db: Session):
    """Ensures class-based and subject-based public chat rooms exist."""
    # Class Rooms
    default_classes = [
        {"name": "Primary Package Community (Grade 1-4)", "type": "class", "grade_min": 1, "grade_max": 4},
        {"name": "Middle Package Community (Grade 5-8)", "type": "class", "grade_min": 5, "grade_max": 8},
        {"name": "Secondary Package Community (Grade 9-12)", "type": "class", "grade_min": 9, "grade_max": 12},
    ]
    for c in default_classes:
        exists = db.query(models.ChatRoom).filter(
            models.ChatRoom.type == "class",
            models.ChatRoom.grade_min == c["grade_min"],
            models.ChatRoom.grade_max == c["grade_max"]
        ).first()
        if not exists:
            room = models.ChatRoom(
                name=c["name"],
                type=c["type"],
                grade_min=c["grade_min"],
                grade_max=c["grade_max"]
            )
            db.add(room)
    
    # Subject Rooms
    default_subjects = ["Mathematics", "Physics", "Somali", "Science", "English"]
    for sub in default_subjects:
        exists = db.query(models.ChatRoom).filter(
            models.ChatRoom.type == "subject",
            models.ChatRoom.subject == sub
        ).first()
        if not exists:
            room = models.ChatRoom(
                name=f"Qolka Wada-hadalka {sub}",
                type="subject",
                subject=sub
            )
            db.add(room)
            
    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# 1. CHAT ROOMS ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/rooms", response_model=List[schemas.ChatRoomOut])
def get_chat_rooms(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription)
):
    """
    List all chat rooms accessible by the current student.
    Includes public class-based, subject-based rooms, and groups/direct channels the user belongs to.
    """
    ensure_default_rooms(db)
    
    # Public package rooms are filtered to the active package/grade band.
    public_rooms = [
        room for room in db.query(models.ChatRoom).filter(
            models.ChatRoom.type.in_(["class", "subject"])
        ).all()
        if _room_grade_allowed(room, current_user)
    ]
    
    # Custom groups / direct chats the user is joined in
    private_room_ids = db.query(models.ChatRoomMember.room_id).filter(
        models.ChatRoomMember.user_id == current_user.id
    ).all()
    private_room_ids = [r[0] for r in private_room_ids]
    
    private_rooms = db.query(models.ChatRoom).filter(
        models.ChatRoom.id.in_(private_room_ids)
    ).all()
    
    return public_rooms + private_rooms


@router.post("/rooms", response_model=schemas.ChatRoomOut)
def create_chat_room(
    room_in: schemas.ChatRoomCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription)
):
    """
    Create a direct messaging (DM) session or a custom Group Chat.
    """
    ensure_not_muted(current_user)

    room_type = room_in.type if room_in.type in ("group", "direct") else "group"
    member_ids = {uid for uid in room_in.members if uid != current_user.id}

    if room_type == "direct":
        if len(member_ids) != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A direct message must include exactly one other student.",
            )
        other_id = next(iter(member_ids))
        other = db.query(models.User).filter(
            models.User.id == other_id,
            models.User.is_active == True,
        ).first()
        if not other:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        if not _same_package_band(current_user, other):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only message students in your active package group.",
            )
        if users_have_block_between(db, current_user.id, other_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Direct messages are unavailable between blocked users.",
            )

        current_room_ids = db.query(models.ChatRoomMember.room_id).filter(
            models.ChatRoomMember.user_id == current_user.id
        ).all()
        for row in current_room_ids:
            room = db.query(models.ChatRoom).filter(
                models.ChatRoom.id == row[0],
                models.ChatRoom.type == "direct",
            ).first()
            if room and set(get_room_member_ids(db, room.id)) == {current_user.id, other_id}:
                return room

        room_name = f"{current_user.full_name} & {other.full_name}"
    else:
        if not room_in.name.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Room name is required.")
        room_name = room_in.name.strip()

    if contains_profanity(room_name, db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Banned words detected in group room name."
        )
        
    room = models.ChatRoom(
        name=room_name,
        type=room_type,
        created_by_id=current_user.id
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    
    # Add creator and members
    members_to_add = set(member_ids)
    members_to_add.add(current_user.id)
    
    for uid in members_to_add:
        # verify user exists
        user_exists = db.query(models.User).filter(models.User.id == uid).first()
        if user_exists and _same_package_band(current_user, user_exists):
            member = models.ChatRoomMember(
                room_id=room.id,
                user_id=uid
            )
            db.add(member)
            
    db.commit()
    return room


# ─────────────────────────────────────────────────────────────────────────────
# 2. MESSAGES ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/rooms/{room_id}/messages", response_model=List[schemas.ChatMessageOut])
def get_room_messages(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription)
):
    """
    Fetch history of messages inside a room. Excludes messages from blocked users.
    """
    # Verify room exists
    room = db.query(models.ChatRoom).filter(models.ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat room not found."
        )
    require_room_access(db, room, current_user)
        
    # Check block list
    blocked_by_user = db.query(models.BlockedUser.blocked_id).filter(
        models.BlockedUser.blocker_id == current_user.id
    ).all()
    blocked_by_user_ids = [u[0] for u in blocked_by_user]
    
    users_who_blocked_me = db.query(models.BlockedUser.blocker_id).filter(
        models.BlockedUser.blocked_id == current_user.id
    ).all()
    users_who_blocked_me_ids = [u[0] for u in users_who_blocked_me]
    
    all_blocked_ids = set(blocked_by_user_ids + users_who_blocked_me_ids)
    
    messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.room_id == room_id
    ).order_by(models.ChatMessage.created_at.asc()).all()
    
    result = []
    for msg in messages:
        if msg.sender_id in all_blocked_ids:
            continue
        result.append(
            schemas.ChatMessageOut(
                id=msg.id,
                room_id=msg.room_id,
                sender_id=msg.sender_id,
                sender_name=msg.sender.full_name,
                sender_role=msg.sender.role,
                content=msg.content,
                image_url=msg.image_url,
                created_at=msg.created_at,
                is_reported=msg.is_reported,
                is_moderated=msg.is_moderated
            )
        )
    return result


@router.post("/rooms/{room_id}/messages", response_model=schemas.ChatMessageOut)
def send_room_message(
    room_id: int,
    msg_in: schemas.ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription)
):
    """
    Post a new message in a room. Validates safety, filters profanity, and updates gamification XP.
    """
    room = db.query(models.ChatRoom).filter(models.ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat room not found."
        )
    require_room_access(db, room, current_user)
    ensure_not_muted(current_user)
        
    if contains_profanity(msg_in.content, db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fariintaada waxaa ku jira erayo aan la ogoleyn! Fadlan ilaali anshaxa."
        )
        
    msg = models.ChatMessage(
        room_id=room_id,
        sender_id=current_user.id,
        content=msg_in.content,
        image_url=msg_in.image_url
    )
    db.add(msg)

    if room.type == "direct":
        receivers = [uid for uid in get_room_member_ids(db, room_id) if uid != current_user.id]
        if receivers:
            db.add(models.DirectMessage(
                sender_id=current_user.id,
                receiver_id=receivers[0],
                content=msg_in.content,
                image_url=msg_in.image_url,
            ))
    
    # Award gamification XP for participation (+5 XP per general message)
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if user:
        user.total_xp_points = (user.total_xp_points or 0) + 5
        # Ensure user streak is updated if this is the first action today
        today = datetime.date.today()
        # Mock simple streak increment logic
        # For simplicity, if they participate, keep/update streak
        if user.current_streak == 0:
            user.current_streak = 1
            
    db.commit()
    db.refresh(msg)
    
    return schemas.ChatMessageOut(
        id=msg.id,
        room_id=msg.room_id,
        sender_id=msg.sender_id,
        sender_name=current_user.full_name,
        sender_role=current_user.role,
        content=msg.content,
        image_url=msg.image_url,
        created_at=msg.created_at,
        is_reported=msg.is_reported,
        is_moderated=msg.is_moderated
    )


# -----------------------------------------------------------------------------
# USER SEARCH AND DIRECT MESSAGE ENDPOINTS
# -----------------------------------------------------------------------------

@router.get("/users/search", response_model=List[schemas.CommunityUserSearchOut])
def search_community_users(
    q: str,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    term = q.strip()
    if len(term) < 2:
        return []
    pattern = f"%{term}%"
    safe_limit = min(max(limit, 1), 20)
    candidates = db.query(models.User).filter(
        models.User.id != current_user.id,
        models.User.is_active == True,
        models.User.role == "student",
        or_(
            models.User.full_name.ilike(pattern),
            models.User.phone_number.ilike(pattern),
        ),
    ).order_by(models.User.full_name.asc()).limit(safe_limit * 3).all()
    return [u for u in candidates if _same_package_band(current_user, u)][:safe_limit]


@router.get("/direct-messages/{other_user_id}", response_model=List[schemas.DirectMessageOut])
def get_direct_messages(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    other = db.query(models.User).filter(models.User.id == other_user_id).first()
    if not other:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if not _same_package_band(current_user, other):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Direct message access is limited to your active package group.")
    if users_have_block_between(db, current_user.id, other_user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Direct message access is blocked.")

    messages = db.query(models.DirectMessage).filter(
        or_(
            and_(models.DirectMessage.sender_id == current_user.id, models.DirectMessage.receiver_id == other_user_id),
            and_(models.DirectMessage.sender_id == other_user_id, models.DirectMessage.receiver_id == current_user.id),
        )
    ).order_by(models.DirectMessage.created_at.asc()).all()

    return [
        schemas.DirectMessageOut(
            id=msg.id,
            sender_id=msg.sender_id,
            receiver_id=msg.receiver_id,
            sender_name=msg.sender.full_name if msg.sender else "Unknown",
            receiver_name=msg.receiver.full_name if msg.receiver else "Unknown",
            content=msg.content,
            image_url=msg.image_url,
            created_at=msg.created_at,
        )
        for msg in messages
    ]


@router.post("/direct-messages", response_model=schemas.DirectMessageOut)
def send_direct_message(
    msg_in: schemas.DirectMessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    ensure_not_muted(current_user)
    if msg_in.receiver_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot message yourself.")
    receiver = db.query(models.User).filter(
        models.User.id == msg_in.receiver_id,
        models.User.is_active == True,
    ).first()
    if not receiver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if not _same_package_band(current_user, receiver):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only message students in your active package group.")
    if users_have_block_between(db, current_user.id, receiver.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Direct messages are blocked.")
    if not msg_in.content.strip() and not msg_in.image_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message content or image is required.")
    if contains_profanity(msg_in.content, db):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message contains blocked words.")

    msg = models.DirectMessage(
        sender_id=current_user.id,
        receiver_id=receiver.id,
        content=msg_in.content,
        image_url=msg_in.image_url,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return schemas.DirectMessageOut(
        id=msg.id,
        sender_id=msg.sender_id,
        receiver_id=msg.receiver_id,
        sender_name=current_user.full_name,
        receiver_name=receiver.full_name,
        content=msg.content,
        image_url=msg.image_url,
        created_at=msg.created_at,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 3. SAFETY, BLOCK & REPORT ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/messages/{message_id}/report")
def report_chat_message(
    message_id: int,
    reason: str = "Toxicity or abuse",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription)
):
    """
    Flag a chat message for teacher or admin moderation review.
    """
    msg = db.query(models.ChatMessage).filter(models.ChatMessage.id == message_id).first()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found."
        )
    room = db.query(models.ChatRoom).filter(models.ChatRoom.id == msg.room_id).first()
    if room:
        require_room_access(db, room, current_user)
        
    msg.is_reported = True
    
    report = models.ReportedMessage(
        message_id=message_id,
        reported_by_id=current_user.id,
        reason=reason
    )
    db.add(report)
    db.commit()
    return {"message": "Message successfully reported to moderators."}


@router.post("/users/{user_id}/block")
def block_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription)
):
    """
    Block a user to filter out their messages.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot block yourself."
        )
        
    exists = db.query(models.BlockedUser).filter(
        models.BlockedUser.blocker_id == current_user.id,
        models.BlockedUser.blocked_id == user_id
    ).first()
    
    if not exists:
        block = models.BlockedUser(
            blocker_id=current_user.id,
            blocked_id=user_id
        )
        db.add(block)
        db.commit()
        
    return {"message": "User blocked successfully."}


@router.post("/users/{user_id}/unblock")
def unblock_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription)
):
    """
    Unblock a previously blocked user.
    """
    block = db.query(models.BlockedUser).filter(
        models.BlockedUser.blocker_id == current_user.id,
        models.BlockedUser.blocked_id == user_id
    ).first()
    
    if block:
        db.delete(block)
        db.commit()
        
    return {"message": "User unblocked successfully."}


# ─────────────────────────────────────────────────────────────────────────────
# 4. HOMEWORK Q&A BOARD ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/questions", response_model=List[schemas.CommunityQuestionOut])
def get_community_questions(
    subject: Optional[str] = None,
    grade_level: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription)
):
    """
    Retrieve homework questions posted in the community, with optional filters.
    """
    allowed_grades = get_user_allowed_grades(current_user)
    query = db.query(models.CommunityQuestion)
    if current_user.role not in ("admin", "teacher"):
        query = query.filter(models.CommunityQuestion.grade_level.in_(allowed_grades or [-1]))
    if subject:
        query = query.filter(models.CommunityQuestion.subject == subject)
    if grade_level:
        query = query.filter(models.CommunityQuestion.grade_level == grade_level)
        
    questions = query.order_by(models.CommunityQuestion.created_at.desc()).all()
    
    result = []
    for q in questions:
        replies_out = []
        for r in q.replies:
            replies_out.append(
                schemas.CommunityQuestionReplyOut(
                    id=r.id,
                    question_id=r.question_id,
                    user_id=r.user_id,
                    user_name=r.user.full_name,
                    content=r.content,
                    created_at=r.created_at
                )
            )
        result.append(
            schemas.CommunityQuestionOut(
                id=q.id,
                user_id=q.user_id,
                user_name=q.user.full_name,
                title=q.title,
                description=q.description,
                image_url=q.image_url,
                subject=q.subject,
                grade_level=q.grade_level,
                created_at=q.created_at,
                is_solved=q.is_solved,
                ai_hint=q.ai_hint,
                ai_solution=q.ai_solution,
                ai_similar_question=q.ai_similar_question,
                replies=replies_out
            )
        )
    return result


@router.post("/questions", response_model=schemas.CommunityQuestionOut)
def create_community_question(
    q_in: schemas.CommunityQuestionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription)
):
    """
    Upload a homework help question screenshot/details. Awards +10 XP.
    """
    ensure_not_muted(current_user)
    if contains_profanity(q_in.title, db) or contains_profanity(q_in.description, db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fariintaada ama cinwaanka waxaa ku jira erayo aan haboonayn."
        )
        
    if current_user.role not in ("admin", "teacher") and q_in.grade_level not in get_user_allowed_grades(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This question is outside your active package.")

    q = models.CommunityQuestion(
        user_id=current_user.id,
        title=q_in.title,
        description=q_in.description,
        image_url=q_in.image_url,
        subject=q_in.subject,
        grade_level=q_in.grade_level
    )
    db.add(q)
    
    # Award gamification XP (+10 XP)
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if user:
        user.total_xp_points = (user.total_xp_points or 0) + 10
        
    db.commit()
    db.refresh(q)
    
    return schemas.CommunityQuestionOut(
        id=q.id,
        user_id=q.user_id,
        user_name=current_user.full_name,
        title=q.title,
        description=q.description,
        image_url=q.image_url,
        subject=q.subject,
        grade_level=q.grade_level,
        created_at=q.created_at,
        is_solved=q.is_solved,
        ai_hint=None,
        ai_solution=None,
        ai_similar_question=None,
        replies=[]
    )


@router.post("/questions/{question_id}/reply", response_model=schemas.CommunityQuestionReplyOut)
def reply_to_question(
    question_id: int,
    reply_in: schemas.CommunityQuestionReplyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription)
):
    """
    Reply to a classmate's homework question. Awards +15 XP for helping.
    """
    q = db.query(models.CommunityQuestion).filter(models.CommunityQuestion.id == question_id).first()
    if not q:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found."
        )
    if current_user.role not in ("admin", "teacher") and q.grade_level not in get_user_allowed_grades(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This question is outside your active package.")
    ensure_not_muted(current_user)

    if contains_profanity(reply_in.content, db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Jawaabtaada waxaa ku jira erayo aan la ogoleyn."
        )
        
    reply = models.CommunityQuestionReply(
        question_id=question_id,
        user_id=current_user.id,
        content=reply_in.content
    )
    db.add(reply)
    
    # Award gamification XP (+15 XP for helping classmate)
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if user:
        user.total_xp_points = (user.total_xp_points or 0) + 15
        
    db.commit()
    db.refresh(reply)
    
    return schemas.CommunityQuestionReplyOut(
        id=reply.id,
        question_id=reply.question_id,
        user_id=reply.user_id,
        user_name=current_user.full_name,
        content=reply.content,
        created_at=reply.created_at
    )


@router.post("/questions/{question_id}/ask-ai", response_model=schemas.CommunityQuestionOut)
def ask_ai_coach(
    question_id: int,
    req: schemas.AskAiRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription)
):
    """
    Triggers Coach Refik AI response for the homework question (Hint, Solution, or Similar Question).
    """
    q = db.query(models.CommunityQuestion).filter(models.CommunityQuestion.id == question_id).first()
    if not q:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found."
        )
        
    # Generate Coach response
    ai_res = generate_community_ai_response(req.action, q.title, q.description, q.subject)
    
    if req.action == "hint":
        q.ai_hint = ai_res
    elif req.action == "solution":
        q.ai_solution = ai_res
        q.is_solved = True  # Auto-mark solved once AI solution generated
    elif req.action == "similar":
        q.ai_similar_question = ai_res
        
    db.commit()
    db.refresh(q)
    
    # Re-fetch replies
    replies_out = []
    for r in q.replies:
        replies_out.append(
            schemas.CommunityQuestionReplyOut(
                id=r.id,
                question_id=r.question_id,
                user_id=r.user_id,
                user_name=r.user.full_name,
                content=r.content,
                created_at=r.created_at
            )
        )
        
    return schemas.CommunityQuestionOut(
        id=q.id,
        user_id=q.user_id,
        user_name=q.user.full_name,
        title=q.title,
        description=q.description,
        image_url=q.image_url,
        subject=q.subject,
        grade_level=q.grade_level,
        created_at=q.created_at,
        is_solved=q.is_solved,
        ai_hint=q.ai_hint,
        ai_solution=q.ai_solution,
        ai_similar_question=q.ai_similar_question,
        replies=replies_out
    )


# ─────────────────────────────────────────────────────────────────────────────
# 5. GAMIFICATION & LEADERBOARD ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/leaderboard", response_model=schemas.LeaderboardOut)
def get_leaderboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription)
):
    """
    Fetch weekly students ranking sorted by total XP.
    """
    top_students = db.query(models.User).filter(
        models.User.role == "student"
    ).order_by(models.User.total_xp_points.desc()).limit(20).all()
    
    rankings = []
    for s in top_students:
        rankings.append(
            schemas.LeaderboardEntry(
                user_id=s.id,
                full_name=s.full_name,
                grade_level=s.grade_level,
                package_type=s.package_type,
                total_xp_points=s.total_xp_points or 0,
                current_streak=s.current_streak or 0
            )
        )
    return schemas.LeaderboardOut(rankings=rankings)


@router.get("/missions", response_model=List[schemas.DailyMissionOut])
def get_daily_missions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription)
):
    """
    Evaluate and fetch student's daily mission progress.
    """
    # 3 Daily Missions:
    # 1. Video Watcher: Watch 1 video today.
    # 2. Quiz Master: Complete 1 quiz attempt today.
    # 3. Community helper: Send 1 chat message or reply today.
    
    today_start = datetime.datetime.combine(datetime.datetime.now(datetime.timezone.utc).date(), datetime.time.min)
    
    # 1. Watch log check
    watch_count = db.query(models.VideoWatchLog).filter(
        models.VideoWatchLog.user_id == current_user.id,
        models.VideoWatchLog.is_completed == True
        # Note: SQLite check for today
    ).count() # simplify checking: check if any logs exist
    
    # 2. Quiz check (TechQuizAttempt or ExamAttempt)
    quiz_attempts = db.query(models.TechQuizAttempt).filter(
        models.TechQuizAttempt.user_id == current_user.id,
        models.TechQuizAttempt.attempted_at >= today_start
    ).count() + db.query(models.ExamAttempt).filter(
        models.ExamAttempt.user_id == current_user.id,
        models.ExamAttempt.completed_at >= today_start
    ).count()
    
    # 3. Chat check (ChatMessage or CommunityQuestionReply)
    chat_count = db.query(models.ChatMessage).filter(
        models.ChatMessage.sender_id == current_user.id,
        models.ChatMessage.created_at >= today_start
    ).count() + db.query(models.CommunityQuestionReply).filter(
        models.CommunityQuestionReply.user_id == current_user.id,
        models.CommunityQuestionReply.created_at >= today_start
    ).count()
    
    missions = [
        schemas.DailyMissionOut(
            id=1,
            title="Daawo Cashar Muuqaal ah (Watch a lesson video)",
            type="video",
            points_reward=10,
            target_count=1,
            current_count=min(1, watch_count),
            is_completed=(watch_count >= 1)
        ),
        schemas.DailyMissionOut(
            id=2,
            title="Xal Imtixaan ama Quiz (Complete 1 Quiz)",
            type="quiz",
            points_reward=20,
            target_count=1,
            current_count=min(1, quiz_attempts),
            is_completed=(quiz_attempts >= 1)
        ),
        schemas.DailyMissionOut(
            id=3,
            title="Caawi Arday kale (Send a message or reply)",
            type="help",
            points_reward=15,
            target_count=1,
            current_count=min(1, chat_count),
            is_completed=(chat_count >= 1)
        )
    ]
    
    # Award points dynamically if mission is just completed (optional / or frontend triggers)
    # To keep it robust, if a student completes a mission, they automatically get the XP added on the action API call.
    return missions


@router.get("/profile/{user_id}", response_model=schemas.StudentProfileStatsOut)
def get_student_profile_stats(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription)
):
    """
    Fetch public stats, streaks, XP and badges of a student for community profile modal.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found."
        )
        
    badges = db.query(models.StudentBadge).filter(models.StudentBadge.user_id == user_id).all()
    
    # Auto-award badges if not already awarded:
    # 1. streak_master: if streak >= 7
    # 2. helping_hand: if classmate replies >= 5
    # 3. fast_learner: if total XP >= 100
    
    has_badge_types = [b.badge_type for b in badges]
    
    reply_count = db.query(models.CommunityQuestionReply).filter(models.CommunityQuestionReply.user_id == user_id).count()
    total_xp = user.total_xp_points or 0
    streak = user.current_streak or 0
    
    badge_award_triggered = False
    
    if streak >= 7 and "streak_master" not in has_badge_types:
        badge = models.StudentBadge(
            user_id=user_id,
            badge_type="streak_master",
            title="Streak Master 🔥",
            description="Lagu helay 7 bari oo waxbarasho oo isku xiga!"
        )
        db.add(badge)
        badge_award_triggered = True
        
    if reply_count >= 5 and "helping_hand" not in has_badge_types:
        badge = models.StudentBadge(
            user_id=user_id,
            badge_type="helping_hand",
            title="Helping Hand 🤝",
            description="U soo jawaabay ugu yaraan 5 su'aalood oo saaxiibadiis qoreen."
        )
        db.add(badge)
        badge_award_triggered = True
        
    if total_xp >= 100 and "fast_learner" not in has_badge_types:
        badge = models.StudentBadge(
            user_id=user_id,
            badge_type="fast_learner",
            title="Fast Learner ⚡",
            description="Soo ururiyey in ka badan 100 dhibco oo XP ah."
        )
        db.add(badge)
        badge_award_triggered = True
        
    if badge_award_triggered:
        db.commit()
        # Re-fetch
        badges = db.query(models.StudentBadge).filter(models.StudentBadge.user_id == user_id).all()
        
    badges_out = [
        schemas.StudentBadgeOut(
            id=b.id,
            user_id=b.user_id,
            badge_type=b.badge_type,
            title=b.title,
            description=b.description,
            awarded_at=b.awarded_at
        ) for b in badges
    ]
    
    completed_lessons = db.query(models.VideoWatchLog).filter(
        models.VideoWatchLog.user_id == user_id,
        models.VideoWatchLog.is_completed == True
    ).count()
    
    solved_quizzes = db.query(models.TechQuizAttempt).filter(
        models.TechQuizAttempt.user_id == user_id
    ).count() + db.query(models.ExamAttempt).filter(
        models.ExamAttempt.user_id == user_id
    ).count()
    
    return schemas.StudentProfileStatsOut(
        user_id=user.id,
        full_name=user.full_name,
        grade_level=user.grade_level,
        package_type=user.package_type,
        total_xp_points=total_xp,
        current_streak=streak,
        badges=badges_out,
        completed_lessons_count=completed_lessons,
        solved_quizzes_count=solved_quizzes
    )
