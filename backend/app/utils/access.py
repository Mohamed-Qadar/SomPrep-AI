import datetime
from fastapi import Depends, HTTPException, status
from app.api.auth import get_current_user
from app import models

def get_allowed_grades(package_type: str) -> list[int]:
    scope = (package_type or "").strip().lower()
    if scope == "academic":
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    if scope == "primary":
        return [1, 2, 3, 4]
    if scope == "middle":
        return [5, 6, 7, 8]
    if scope == "secondary":
        return [9, 10, 11, 12]
    return []


def get_user_allowed_grades(user: models.User) -> list[int]:
    return get_allowed_grades(getattr(user, "package_access_scope", None) or user.package_type)

def check_content_access(user: models.User, grade_level: int) -> bool:
    if user.role in ("admin", "teacher"):
        return True
    if not user.package_type:
        return False
    if not user.package_expires_at:
        return False
        
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    if user.package_expires_at <= now:
        return False
        
    return grade_level in get_user_allowed_grades(user)

from fastapi import Request

class PackageAccessGuard:
    def __init__(self, grade_level: int = None):
        self.grade_level = grade_level

    def __call__(self, request: Request, current_user: models.User = Depends(get_current_user)):
        grade = self.grade_level
        if grade is None:
            grade_str = request.path_params.get("grade_level")
            if grade_str:
                try:
                    grade = int(grade_str)
                except ValueError:
                    pass
        if grade is not None:
            if not check_content_access(current_user, grade):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Package upgrade required"
                )
        return current_user

def require_package_access(grade_level: int = None):
    """
    FastAPI dependency to ensure the user's active package covers the grade_level.
    Can be used statically: Depends(require_package_access(12))
    Or dynamically from path: Depends(require_package_access())
    """
    return PackageAccessGuard(grade_level)


def has_active_subscription(user: models.User) -> bool:
    """
    Non-raising check: True if the user currently has an active subscription.
    Admins and teachers are always treated as having access.
    """
    if user.role in ("admin", "teacher"):
        return True

    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

    if user.package_type and user.package_expires_at and user.package_expires_at > now:
        return True

    sub = getattr(user, "subscription", None)
    if sub and sub.status == "active" and sub.expires_at and sub.expires_at > now:
        return True

    return False


def require_active_subscription(current_user: models.User = Depends(get_current_user)):
    """
    FastAPI dependency that requires an active subscription to proceed.
    Admins and teachers bypass this guard. Returns the user when allowed,
    otherwise raises HTTP 403 (the frontend interceptor turns this into a paywall).
    """
    if not has_active_subscription(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Waxaad u baahan tahay rukun firfircoon si aad u hesho qaybtan. "
                "(An active subscription is required to access this premium feature.)"
            ),
        )
    return current_user

