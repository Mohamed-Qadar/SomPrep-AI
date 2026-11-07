"""
Legacy `/api/payments` router — RETAINED for two live, safe endpoints only:
  * GET  /api/payments/status          -> current subscription status (used by the
                                          frontend AuthContext).
  * POST /api/payments/voucher-redeem  -> redeem an admin-issued voucher code.

The historical auto-activation endpoints (/subscribe, /checkout-12month) are
DEPRECATED and return HTTP 410 — they previously granted free subscriptions in
sandbox mode. Canonical payment logic lives in app/api/payments_system.py
(accounts, submissions, verification) and app/api/payment.py (EVC Plus confirm).
"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.config import settings
from app.api.auth import get_current_user
from app.database import get_db
from app.utils.rate_limit import rate_limit

router = APIRouter(prefix="/api/payments", tags=["Payments"])


# ─────────────────────────────────────────────────────────────────────────────
# DEPRECATED — INSECURE AUTO-ACTIVATION ENDPOINTS
# These previously activated a subscription as soon as the EVC client returned
# SUCCESS. In sandbox mode the gateway ALWAYS returns SUCCESS, so any logged-in
# user could self-activate a paid subscription for free. A gateway "SUCCESS"
# only means the USSD push was sent, never that money was received.
#
# Activation now happens ONLY after a payment is verified, via:
#   * /api/payment/evc-plus  -> /api/payment/evc-plus/confirm  (admin/teacher), or
#   * /api/payments_system/submit-manual -> admin approval.
# These endpoints are kept (so old clients get a clear error) but no longer
# grant access.
# ─────────────────────────────────────────────────────────────────────────────

_DEPRECATION_DETAIL = (
    "This endpoint has been disabled for security. Please complete payment through "
    "EVC Plus checkout; access is activated only after the payment is verified."
)


@router.post("/subscribe", response_model=schemas.SubscriptionStatusOut)
async def subscribe(
    payload: schemas.SubscribeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """DEPRECATED: auto-activation removed. Use the verified EVC Plus flow."""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail=_DEPRECATION_DETAIL,
    )


@router.post("/checkout-12month", response_model=schemas.SubscriptionStatusOut)
async def checkout_12month(
    payload: schemas.SubscribeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """DEPRECATED: auto-activation removed. Use the verified EVC Plus flow."""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail=_DEPRECATION_DETAIL,
    )


@router.get("/status", response_model=schemas.SubscriptionStatusOut)
async def get_subscription_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Checks if the authenticated user has an active subscription.
    """
    subscription = (
        db.query(models.UserSubscription)
        .filter(models.UserSubscription.user_id == current_user.id)
        .first()
    )

    if not subscription:
        return schemas.SubscriptionStatusOut(
            is_active=False, expires_at=None, activated_at=None, price_paid=0.0
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    is_active = subscription.status == "active" and subscription.expires_at > now

    return schemas.SubscriptionStatusOut(
        is_active=is_active,
        expires_at=subscription.expires_at,
        activated_at=subscription.activated_at,
        price_paid=subscription.price_paid or 2.50,
    )


from pydantic import BaseModel

class VoucherRedeem(BaseModel):
    code: str

@router.post(
    "/voucher-redeem",
    response_model=schemas.SubscriptionStatusOut,
    dependencies=[Depends(rate_limit("voucher", max_calls=8, window_seconds=60))],
)
async def redeem_voucher(
    payload: VoucherRedeem,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Redeems a voucher code to activate a 365-day student subscription.
    Checks if voucher code exists, is active, and marks it as used.
    """
    # Atomic claim: flip active -> used in a single UPDATE so two concurrent
    # redemptions of the same code cannot both succeed (only one row updates).
    claimed = (
        db.query(models.Voucher)
        .filter(models.Voucher.code == payload.code, models.Voucher.status == "active")
        .update({"status": "used", "student_id": current_user.id}, synchronize_session=False)
    )
    if claimed == 0:
        # Either the code does not exist or it was already used/expired.
        exists = db.query(models.Voucher).filter(models.Voucher.code == payload.code).first()
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Koodhkaan mar hore ayaa la isticmaalay ama wuu dhacay. (Voucher already used or expired)."
                if exists else
                "Koodhka voucher-ka ma jiro ama waa khaldan yahay. (Voucher code not found)."
            ),
        )
    voucher = db.query(models.Voucher).filter(models.Voucher.code == payload.code).first()

    # The voucher dictates the plan — never trust the user's current selection.
    from app.api.package_catalog import get_active_package
    from app.utils.access import get_allowed_grades
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.id == voucher.plan_id).first()
    if not plan or not plan.is_active:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Xirmada voucher-ku ku xiran yahay ma jirto. (The voucher's package is no longer available).",
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    expires_at = now + timedelta(days=365)

    current_user.package_type = plan.slug
    current_user.package_access_scope = plan.access_scope
    current_user.package_paid_at = now
    current_user.package_expires_at = expires_at
    allowed = get_allowed_grades(plan.access_scope)
    if allowed and current_user.grade_level not in allowed:
        current_user.grade_level = max(allowed)

    subscription = (
        db.query(models.UserSubscription)
        .filter(models.UserSubscription.user_id == current_user.id)
        .first()
    )
    if subscription:
        subscription.status = "active"
        subscription.expires_at = expires_at
        subscription.activated_at = now
        subscription.price_paid = 0.0
        subscription.transaction_id = f"VOUCHER-{payload.code}"
    else:
        subscription = models.UserSubscription(
            user_id=current_user.id,
            status="active",
            expires_at=expires_at,
            activated_at=now,
            price_paid=0.0,
            transaction_id=f"VOUCHER-{payload.code}",
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
