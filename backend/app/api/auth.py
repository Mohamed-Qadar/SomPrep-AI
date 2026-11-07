from typing import List, Optional
import datetime
import hashlib
import hmac
import secrets
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.utils.auth import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from app.utils.rate_limit import rate_limit
from app.utils.audit import log_admin_action
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Define the OAuth2 scheme. It extracts the bearer token from the Authorization header.
# We point tokenUrl to the login endpoint.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


_ADMIN_OTP_TTL_MINUTES = 10
_ADMIN_OTP_MAX_ATTEMPTS = 5


def _utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


def _hash_secret(value: str) -> str:
    return hashlib.sha256(f"{settings.SECRET_KEY}:{value}".encode("utf-8")).hexdigest()


def _verify_secret(value: str, hashed: str) -> bool:
    return hmac.compare_digest(_hash_secret(value), hashed or "")


def _mask_destination(value: str) -> str:
    digits = "".join(ch for ch in (value or "") if ch.isdigit())
    if len(digits) < 6:
        return "***"
    return f"***{digits[-4:]}"


def _validate_new_admin_password(password: str):
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if not any(ch.isupper() for ch in password):
        raise HTTPException(status_code=400, detail="Password must include an uppercase letter.")
    if not any(ch.islower() for ch in password):
        raise HTTPException(status_code=400, detail="Password must include a lowercase letter.")
    if not any(ch.isdigit() for ch in password):
        raise HTTPException(status_code=400, detail="Password must include a number.")


# --- DEPENDENCY ---
def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    """
    Reusable dependency that extracts the JWT token from the Request headers,
    verifies it, and returns the User object from the database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    phone_number: str = payload.get("sub")
    user_id: int = payload.get("user_id")

    if phone_number is None or user_id is None:
        raise credentials_exception

    # Query the user from the database
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User account is deactivated"
        )

    token_admin_version = payload.get("admin_session_version")
    if user.role == "admin":
        if payload.get("scope") != "admin":
            raise credentials_exception
        if token_admin_version != user.admin_session_version:
            raise credentials_exception

    # Single-device rule: every login rotates session_version, so only the
    # token from the most recent login stays valid. Prevents one paid account
    # being shared across a whole class.
    if payload.get("session_version") != (user.session_version or 0):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Akoonkan waxaa laga galay qalab kale. Fadlan mar kale soo gal. (Signed in on another device — please log in again.)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user._token_scope = payload.get("scope")
    return user


class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: models.User = Depends(get_current_user)) -> models.User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ururintan waxaa loo ogol yahay oo kaliya maamulayaasha iyo macalimiinta (Forbidden).",
            )
        return current_user


def require_role(allowed_roles: List[str]):
    return RoleChecker(allowed_roles)

# --- ENDPOINTS ---
@router.post(
    "/register",
    response_model=schemas.UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("register", max_calls=5, window_seconds=60))],
)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a user with a unique phone number. Hashes the password before storing it.
    Validates package type matches the chosen grade level.
    """
    # Check if phone number already exists
    existing_user = (
        db.query(models.User)
        .filter(models.User.phone_number == user_in.phone_number)
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered",
        )

    # Validate grade level compatibility with the admin-managed package catalog.
    from app.api.package_catalog import ensure_default_packages, get_active_package
    ensure_default_packages(db)
    pkg = user_in.package_type
    grade = user_in.grade_level
    selected_plan = get_active_package(db, pkg)
    if not selected_plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Xirmadan ma jirto ama waa dansan tahay. (Package does not exist or is inactive.)",
        )
    from app.utils.access import get_allowed_grades
    allowed = get_allowed_grades(selected_plan.access_scope)
    if allowed and grade not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Fasalka {grade} kuma jiro xirmada {selected_plan.name}.",
        )

    # Hash the password
    hashed_password = get_password_hash(user_in.password)

    # Create new User model. Role is pinned to "student" regardless of input:
    # public registration must never mint teacher/admin accounts.
    new_user = models.User(
        phone_number=user_in.phone_number,
        full_name=user_in.full_name,
        hashed_password=hashed_password,
        role="student",
        selected_region=user_in.selected_region,
        grade_level=user_in.grade_level,
        package_type=pkg,
        package_access_scope=selected_plan.access_scope,
        education_level=user_in.education_level,
        learning_goal=user_in.learning_goal,
        learner_type=user_in.learner_type,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post(
    "/login",
    response_model=schemas.Token,
    dependencies=[Depends(rate_limit("login", max_calls=10, window_seconds=60))],
)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Validate phone number and password, and return a JWT access token.
    """
    # Query user by phone number
    user = (
        db.query(models.User)
        .filter(models.User.phone_number == credentials.phone_number)
        .first()
    )

    # Validate credentials
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone number or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated",
        )

    if user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts must sign in from /loginasadmin.",
        )

    # Rotate the session version: any token issued by a previous login on
    # another device becomes invalid immediately (single-device rule).
    user.session_version = (user.session_version or 0) + 1
    db.commit()

    # Generate JWT Token payload
    token_data = {
        "sub": user.phone_number,
        "role": user.role,
        "user_id": user.id,
        "grade_level": user.grade_level,
        "package_type": user.package_type,
        "package_active": user.package_active,
        "scope": "user",
        "session_version": user.session_version,
    }
    access_token = create_access_token(data=token_data)

    return {"access_token": access_token, "token_type": "bearer"}


@router.post(
    "/admin/login",
    response_model=schemas.Token,
    dependencies=[Depends(rate_limit("admin_login", max_calls=6, window_seconds=60))],
)
def admin_login(
    credentials: schemas.AdminLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.phone_number == credentials.phone_number).first()
    if not user or user.role != "admin" or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin phone number or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Admin account is deactivated")

    user.session_version = (user.session_version or 0) + 1
    token_data = {
        "sub": user.phone_number,
        "role": user.role,
        "user_id": user.id,
        "grade_level": user.grade_level,
        "package_type": user.package_type,
        "package_active": user.package_active,
        "scope": "admin",
        "admin_session_version": user.admin_session_version,
        "session_version": user.session_version,
    }
    access_token = create_access_token(data=token_data)
    log_admin_action(
        db,
        admin=user,
        action_type="admin_login",
        request=request,
        target_type="user",
        target_id=user.id,
    )
    db.commit()
    return {"access_token": access_token, "token_type": "bearer"}


@router.post(
    "/admin/password-reset/request",
    response_model=schemas.AdminPasswordResetRequestOut,
    dependencies=[Depends(rate_limit("admin_password_reset_request", max_calls=3, window_seconds=300))],
)
def request_admin_password_reset(
    payload: schemas.AdminPasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    admin = db.query(models.User).filter(
        models.User.phone_number == payload.phone_number,
        models.User.role == "admin",
        models.User.is_active == True,
    ).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Active admin account not found.")

    now = _utcnow()
    db.query(models.AdminPasswordResetOTP).filter(
        models.AdminPasswordResetOTP.admin_id == admin.id,
        models.AdminPasswordResetOTP.used_at.is_(None),
    ).update({"used_at": now})

    otp = f"{secrets.randbelow(1_000_000):06d}"
    challenge = models.AdminPasswordResetOTP(
        admin_id=admin.id,
        otp_hash=_hash_secret(otp),
        delivery_channel=payload.channel,
        destination_masked=_mask_destination(admin.phone_number),
        expires_at=now + datetime.timedelta(minutes=_ADMIN_OTP_TTL_MINUTES),
    )
    db.add(challenge)
    log_admin_action(
        db,
        admin=admin,
        action_type="admin_password_reset_requested",
        request=request,
        target_type="user",
        target_id=admin.id,
        new_value={"channel": payload.channel, "destination": challenge.destination_masked},
    )
    db.commit()
    db.refresh(challenge)

    # Real SMS/email provider integration belongs here. In development only,
    # expose the OTP so local admins can test the flow without an SMS gateway.
    debug_otp: Optional[str] = None
    if not settings.is_production:
        debug_otp = otp
        print(f"DEV ADMIN RESET OTP for {challenge.destination_masked}: {otp}")

    return schemas.AdminPasswordResetRequestOut(
        reset_id=challenge.id,
        message="OTP sent to the configured admin contact.",
        destination=challenge.destination_masked,
        expires_in_minutes=_ADMIN_OTP_TTL_MINUTES,
        debug_otp=debug_otp,
    )


@router.post(
    "/admin/password-reset/verify",
    response_model=schemas.AdminPasswordResetVerifyOut,
    dependencies=[Depends(rate_limit("admin_password_reset_verify", max_calls=8, window_seconds=300))],
)
def verify_admin_password_reset(
    payload: schemas.AdminPasswordResetVerify,
    request: Request,
    db: Session = Depends(get_db),
):
    challenge = db.query(models.AdminPasswordResetOTP).filter(
        models.AdminPasswordResetOTP.id == payload.reset_id,
        models.AdminPasswordResetOTP.used_at.is_(None),
    ).first()
    now = _utcnow()
    if not challenge or challenge.expires_at < now:
        raise HTTPException(status_code=400, detail="OTP expired or invalid.")
    if challenge.attempts >= _ADMIN_OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many OTP attempts.")

    challenge.attempts += 1
    if not _verify_secret(payload.otp, challenge.otp_hash):
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    reset_token = secrets.token_urlsafe(32)
    challenge.reset_token_hash = _hash_secret(reset_token)
    challenge.verified_at = now
    log_admin_action(
        db,
        admin=challenge.admin,
        action_type="admin_password_reset_otp_verified",
        request=request,
        target_type="user",
        target_id=challenge.admin_id,
    )
    db.commit()
    return schemas.AdminPasswordResetVerifyOut(
        reset_token=reset_token,
        message="OTP verified. You can now set a new admin password.",
    )


@router.post(
    "/admin/password-reset/confirm",
    response_model=schemas.AdminPasswordResetConfirmOut,
    dependencies=[Depends(rate_limit("admin_password_reset_confirm", max_calls=5, window_seconds=300))],
)
def confirm_admin_password_reset(
    payload: schemas.AdminPasswordResetConfirm,
    request: Request,
    db: Session = Depends(get_db),
):
    _validate_new_admin_password(payload.new_password)
    challenge = db.query(models.AdminPasswordResetOTP).filter(
        models.AdminPasswordResetOTP.id == payload.reset_id,
        models.AdminPasswordResetOTP.used_at.is_(None),
    ).first()
    now = _utcnow()
    if not challenge or challenge.expires_at < now or not challenge.verified_at:
        raise HTTPException(status_code=400, detail="Reset token expired or invalid.")
    if not _verify_secret(payload.reset_token, challenge.reset_token_hash or ""):
        raise HTTPException(status_code=400, detail="Reset token expired or invalid.")

    admin = db.query(models.User).filter(models.User.id == challenge.admin_id, models.User.role == "admin").first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin account not found.")

    admin.hashed_password = get_password_hash(payload.new_password)
    admin.password_changed_at = now
    admin.admin_session_version = (admin.admin_session_version or 0) + 1
    challenge.used_at = now
    log_admin_action(
        db,
        admin=admin,
        action_type="admin_password_reset_completed",
        request=request,
        target_type="user",
        target_id=admin.id,
        new_value={"sessions_invalidated": True},
    )
    db.commit()
    return schemas.AdminPasswordResetConfirmOut(message="Admin password reset successfully. Please sign in again.")


@router.get("/me", response_model=schemas.UserOut)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    """
    Returns the currently logged-in user profile. Secured by get_current_user dependency.
    """
    return current_user


@router.put("/profile", response_model=schemas.UserOut)
def update_profile(
    profile_in: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Updates the student's selected region and grade level dynamically.
    Ensures grade level is compatible with current package.
    """
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    
    # If student, validate that grade_level is compatible with package
    if user.role not in ("admin", "teacher") and user.package_type:
        from app.utils.access import get_allowed_grades, get_user_allowed_grades
        allowed = get_user_allowed_grades(user)
        if allowed and profile_in.grade_level not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fasalka {profile_in.grade_level} kuma jiro xirmadaada hadda ee {user.package_type}.",
            )

    user.selected_region = profile_in.selected_region
    user.grade_level = profile_in.grade_level
    db.commit()
    db.refresh(user)
    return user


@router.get("/my-package", response_model=schemas.MyPackageOut)
def get_my_package(
    current_user: models.User = Depends(get_current_user)
):
    """
    Fetch the student's active package status, allowed grades, and days remaining.
    """
    from app.utils.access import get_allowed_grades, get_user_allowed_grades
    days_remaining = 0
    if current_user.package_expires_at:
        now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        delta = current_user.package_expires_at - now_utc
        days_remaining = max(0, delta.days)
    
    return schemas.MyPackageOut(
        package_type=current_user.package_type,
        package_access_scope=current_user.package_access_scope,
        grade_level=current_user.grade_level,
        package_active=current_user.package_active,
        package_expires_at=current_user.package_expires_at,
        allowed_grades=get_user_allowed_grades(current_user),
        days_remaining=days_remaining
    )


@router.post("/select-package", response_model=schemas.UserOut)
def select_package(
    payload: schemas.PackageSelectPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Update/Switch the student's chosen package before payment. Resets activation status.
    """
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    from app.api.package_catalog import ensure_default_packages, get_active_package
    ensure_default_packages(db)
    selected_plan = get_active_package(db, payload.package_type)
    if not selected_plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Xirmadan ma jirto ama waa dansan tahay. (Package does not exist or is inactive.)",
        )

    user.package_type = selected_plan.slug
    user.package_access_scope = selected_plan.access_scope
    user.package_paid_at = None
    user.package_expires_at = None

    from app.utils.access import get_allowed_grades
    allowed = get_allowed_grades(selected_plan.access_scope)
    if allowed and user.grade_level not in allowed:
        user.grade_level = max(allowed)

    db.commit()
    db.refresh(user)
    return user
