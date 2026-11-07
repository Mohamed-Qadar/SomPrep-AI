"""
Admin audit logging helper.

Records sensitive admin/teacher actions to the admin_action_logs table.
Logging is best-effort: a failure here must never break the primary action.
The log row is added to the caller's session and persisted on the caller's
next commit.
"""
import json
from typing import Any, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app import models


def _client_ip(request: Optional[Request]) -> Optional[str]:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _coerce(value: Any) -> Optional[str]:
    if value is None or isinstance(value, str):
        return value
    try:
        return json.dumps(value, default=str)
    except Exception:
        return str(value)


def log_admin_action(
    db: Session,
    *,
    admin: Optional[models.User] = None,
    action_type: str,
    request: Optional[Request] = None,
    target_type: Optional[str] = None,
    target_id: Optional[Any] = None,
    old_value: Any = None,
    new_value: Any = None,
) -> None:
    """Append an admin action to the audit log (best-effort)."""
    try:
        entry = models.AdminActionLog(
            admin_id=getattr(admin, "id", None),
            admin_name=getattr(admin, "full_name", None),
            action_type=action_type,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            old_value=_coerce(old_value),
            new_value=_coerce(new_value),
            ip_address=_client_ip(request),
        )
        db.add(entry)
    except Exception:
        # Audit logging must never break the primary request.
        pass
