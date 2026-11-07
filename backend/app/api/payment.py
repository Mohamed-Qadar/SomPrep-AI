"""
EVC Plus payment request endpoint (production-ready structure).

Design principles:
  * A payment request is logged as a transaction and ALWAYS starts as 'pending'.
  * Initiating a payment NEVER activates a subscription. Activation only happens
    in the separate, access-controlled /evc-plus/confirm step once the payment is
    actually verified (admin action / Hormuud webhook).
  * No fake success: the response reflects the real gateway outcome. A successful
    gateway push means the request was *sent* (status stays 'pending'), not that
    money was received.
"""

import re
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.api.auth import get_current_user, require_role
from app.database import get_db
from app.services.evc_client import EVCPlusClient
from app.api.package_catalog import ensure_default_packages, get_active_package

router = APIRouter(prefix="/api/payment", tags=["EVC Plus Payment"])
evc_client = EVCPlusClient()

# Server-side pricing is loaded from the admin-managed package catalog.
# Accepts Somali mobile formats: 61-69xxxxxxx, 77xxxxxxx, 90xxxxxxx
# with optional 0, 252, or +252 prefix.
_PHONE_RE = re.compile(r"^(?:\+?252|0)?(?:6[1-9]|77|90)\d{7}$")


def _normalize_phone(raw: str) -> str:
    return re.sub(r"[\s\-()]", "", raw or "")


def _is_valid_evc_phone(raw: str) -> bool:
    return bool(_PHONE_RE.match(_normalize_phone(raw)))


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


@router.post("/evc-plus", response_model=schemas.EVCPlusPaymentResponse)
async def create_evc_plus_payment(
    payload: schemas.EVCPlusPaymentRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Create and dispatch an EVC Plus payment request. Logs a transaction and keeps
    the subscription inactive. Returns the real gateway outcome.
    """
    # ── Input validation ────────────────────────────────────────────────────
    ensure_default_packages(db)
    selected_plan = get_active_package(db, payload.package_id)
    if not selected_plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown or inactive package_id: {payload.package_id}",
        )
    if payload.billing_cycle == "annual":
        expected_amount = selected_plan.price
    else:
        expected_amount = selected_plan.monthly_price
    if expected_amount is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Billing cycle '{payload.billing_cycle}' is not available for this package.",
        )

    if round(float(payload.amount), 2) != round(float(expected_amount), 2):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount does not match the official package price.",
        )

    if payload.currency != "USD":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only USD is supported.",
        )

    if not _is_valid_evc_phone(payload.evc_phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lambarka EVC Plus ma sax ahan. (Invalid EVC Plus phone number).",
        )

    # ── Log the request as pending (transaction logging) ────────────────────
    record = models.PaymentRequest(
        user_id=current_user.id,
        package_id=payload.package_id,
        billing_cycle=payload.billing_cycle,
        amount=round(float(payload.amount), 2),
        currency="USD",
        evc_phone=_normalize_phone(payload.evc_phone),
        status="pending",
        transaction_id=f"PR-{int(time.time() * 1000)}-{current_user.id}",
        message="Payment request created. Awaiting EVC Plus confirmation.",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # ── Dispatch to the EVC Plus gateway ────────────────────────────────────
    try:
        gateway = await evc_client.initiate_merchant_payment(
            student_phone=record.evc_phone, amount=record.amount
        )
    except Exception as exc:  # noqa: BLE001 - any gateway error must be logged, not raised
        record.status = "failed"
        record.message = f"Gateway error: {exc}"
        record.updated_at = _now()
        db.commit()
        return schemas.EVCPlusPaymentResponse(
            success=False,
            transaction_id=record.transaction_id,
            status="failed",
            message="Could not reach the EVC Plus service. Your access is not active. Please try again.",
        )

    if gateway.get("status") == "SUCCESS":
        # The push was accepted by the gateway. The customer must still approve the
        # prompt on their phone. We deliberately keep status 'pending' and DO NOT
        # activate any subscription here.
        if gateway.get("transaction_id"):
            record.transaction_id = gateway["transaction_id"]
        record.message = (
            "Payment request sent to your EVC Plus number. Approve the prompt on your "
            "phone. Access activates only after the payment is confirmed."
        )
        record.updated_at = _now()
        db.commit()
        return schemas.EVCPlusPaymentResponse(
            success=True,
            transaction_id=record.transaction_id,
            status="pending",
            message=record.message,
        )

    # Gateway rejected the request.
    record.status = "failed"
    record.message = gateway.get("message", "Payment request was rejected by the gateway.")
    record.updated_at = _now()
    db.commit()
    return schemas.EVCPlusPaymentResponse(
        success=False,
        transaction_id=record.transaction_id,
        status="failed",
        message=record.message,
    )


@router.get("/evc-plus/{transaction_id}", response_model=schemas.EVCPlusPaymentResponse)
def get_evc_plus_status(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return the current status of a payment request owned by the caller."""
    record = (
        db.query(models.PaymentRequest)
        .filter(models.PaymentRequest.transaction_id == transaction_id)
        .first()
    )
    if not record or (record.user_id != current_user.id and current_user.role not in ("admin", "teacher")):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payment request not found."
        )

    return schemas.EVCPlusPaymentResponse(
        success=record.status != "failed",
        transaction_id=record.transaction_id,
        status=record.status,
        message=record.message or "",
    )


@router.post("/evc-plus/confirm", response_model=schemas.SubscriptionStatusOut)
async def confirm_evc_plus_payment(
    payload: schemas.EVCPlusConfirmRequest,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role(["admin", "teacher"])),
):
    """
    Confirm a verified payment and ONLY THEN activate the subscription.

    In production this is driven by a verified Hormuud webhook (with signature
    checks). It is access-controlled to admin/teacher so a subscription can never
    be self-activated from the client.
    """
    record = (
        db.query(models.PaymentRequest)
        .filter(models.PaymentRequest.transaction_id == payload.transaction_id)
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payment request not found."
        )
    if record.status == "failed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot confirm a failed payment request.",
        )

    record.status = "confirmed"
    record.updated_at = _now()

    now = _now()
    expires_at = now + timedelta(days=365)
    
    # Update User model package fields
    user = db.query(models.User).filter(models.User.id == record.user_id).first()
    if user:
        user.package_type = record.package_id
        plan = get_active_package(db, record.package_id)
        if plan:
            user.package_access_scope = plan.access_scope
        user.package_paid_at = now
        user.package_expires_at = expires_at
        # Set grade_level if not already set (or if invalid/zero)
        if not user.grade_level:
            if record.package_id == "academic":
                user.grade_level = 12
            elif record.package_id == "primary":
                user.grade_level = 4
            elif record.package_id == "middle":
                user.grade_level = 8
            elif record.package_id == "secondary":
                user.grade_level = 12

    subscription = (
        db.query(models.UserSubscription)
        .filter(models.UserSubscription.user_id == record.user_id)
        .first()
    )
    if subscription:
        subscription.status = "active"
        subscription.expires_at = expires_at
        subscription.activated_at = now
        subscription.price_paid = record.amount
        subscription.transaction_id = record.transaction_id
    else:
        subscription = models.UserSubscription(
            user_id=record.user_id,
            status="active",
            expires_at=expires_at,
            activated_at=now,
            price_paid=record.amount,
            transaction_id=record.transaction_id,
        )
        db.add(subscription)

    db.commit()
    db.refresh(subscription)

    return schemas.SubscriptionStatusOut(
        is_active=True,
        expires_at=subscription.expires_at,
        activated_at=subscription.activated_at,
        price_paid=subscription.price_paid,
    )
