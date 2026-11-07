"""
Payment provider webhook verification & processing service (FUTURE-READY).

This module defines a clean, safe architecture for handling EVC Plus / Hormuud /
WaafiPay payment callbacks. It is intentionally DORMANT in the current build:

  * Signatures can only be verified when EVC_WEBHOOK_SECRET is configured.
  * If no secret is configured, every callback is logged as 'unverified' and NO
    subscription is ever activated.
  * Even with a valid signature, a subscription is activated ONLY when the full
    validation chain passes (unique txn, amount, currency, receiver, status,
    user/package reference, timestamp).

When a real provider is integrated, only the field-extraction mapping
(`_extract`) and `map_provider_status` need to be adapted to the provider's
payload; the safety checks below stay the same.
"""
import datetime
import hashlib
import hmac
import json
from typing import Optional

from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.api.package_catalog import ensure_default_packages, get_active_package
from app.utils.audit import log_admin_action

# Webhook pricing is loaded from the admin-managed package catalog.
# Accepted age of a callback before we treat its timestamp as stale (seconds).
_MAX_EVENT_AGE_SECONDS = 60 * 60  # 1 hour


def signature_configured() -> bool:
    """True only when a webhook shared secret is configured."""
    return bool(settings.EVC_WEBHOOK_SECRET)


def verify_signature(raw_body: bytes, signature: Optional[str]) -> bool:
    """
    Verify an HMAC-SHA256 signature of the raw request body using the configured
    shared secret. Returns False when no secret is configured or signature is
    missing/invalid. Uses a constant-time comparison.
    """
    secret = settings.EVC_WEBHOOK_SECRET
    if not secret or not signature:
        return False
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    # Allow an optional "sha256=" prefix some providers use.
    provided = signature.split("=", 1)[1] if "=" in signature else signature
    return hmac.compare_digest(expected, provided.strip())


def map_provider_status(raw_status: Optional[str]) -> str:
    """Map a provider status string to our internal canonical status."""
    s = (raw_status or "").strip().lower()
    if s in {"success", "successful", "completed", "paid", "2001", "approved"}:
        return "successful"
    if s in {"pending", "processing", "waiting"}:
        return "pending"
    if s in {"cancelled", "canceled"}:
        return "cancelled"
    if s in {"insufficient", "insufficient_balance"}:
        return "insufficient_balance"
    return "failed"


def _utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


def _extract_generic(payload: dict) -> dict:
    """
    Default field mapping covering WaafiPay-style payloads. Kept defensive
    (best-effort) — every value is optional and validated downstream.
    """
    params = payload.get("params") or payload
    return {
        "event_id": str(payload.get("event_id") or payload.get("requestId") or params.get("transactionId") or ""),
        "transaction_id": str(params.get("transactionId") or params.get("referenceId") or payload.get("transaction_id") or ""),
        "amount": params.get("amount") or payload.get("amount"),
        "currency": (params.get("currency") or payload.get("currency") or "USD"),
        "status": payload.get("responseCode") or params.get("state") or payload.get("status"),
        "receiver": params.get("merchantUid") or payload.get("receiver") or payload.get("merchant"),
        "user_id": payload.get("user_id") or params.get("user_id"),
        "package_id": payload.get("package_id") or params.get("package_id"),
        "billing_cycle": payload.get("billing_cycle") or params.get("billing_cycle") or "annual",
        "timestamp": payload.get("timestamp") or params.get("timestamp"),
    }


# Provider extensibility: register one extractor per provider slug. A new
# provider (Zaad, eDahab, Premier Wallet, ...) only needs its own mapping
# function here — the signature check and validation chain are shared.
_EXTRACTORS = {
    "waafipay": _extract_generic,
    "evcplus": _extract_generic,
    "default": _extract_generic,
}


def _extract(payload: dict, provider: str = "default") -> dict:
    extractor = _EXTRACTORS.get((provider or "default").lower(), _EXTRACTORS["default"])
    return extractor(payload)


def _expected_price(db: Session, package_id: str, billing_cycle: str) -> Optional[float]:
    ensure_default_packages(db)
    plan = get_active_package(db, package_id)
    if not plan:
        return None
    return float(plan.price) if billing_cycle == "annual" else plan.monthly_price


def _activate_subscription(db: Session, user: models.User, package_id: str, amount: float, txn: str) -> None:
    now = _utcnow()
    expires_at = now + datetime.timedelta(days=365)
    user.package_type = package_id
    plan = get_active_package(db, package_id)
    if plan:
        user.package_access_scope = plan.access_scope
    user.package_paid_at = now
    user.package_expires_at = expires_at
    sub = (
        db.query(models.UserSubscription)
        .filter(models.UserSubscription.user_id == user.id)
        .first()
    )
    if not sub:
        sub = models.UserSubscription(user_id=user.id)
        db.add(sub)
    sub.status = "active"
    sub.expires_at = expires_at
    sub.activated_at = now
    sub.price_paid = amount
    sub.transaction_id = txn


def process_webhook(db: Session, provider: str, raw_body: bytes, signature: Optional[str]) -> dict:
    """
    Idempotently process a provider webhook. Returns a dict with at least
    {"status": <internal status>, "activated": bool}. Never raises on validation
    failure — it records the outcome and returns it.
    """
    try:
        payload = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except Exception:
        payload = {}

    data = _extract(payload if isinstance(payload, dict) else {}, provider)
    event_id = data["event_id"] or hashlib.sha256(raw_body or b"").hexdigest()[:32]

    # ── Idempotency: do not reprocess a known event ─────────────────────────
    existing = db.query(models.WebhookEvent).filter(
        models.WebhookEvent.event_id == event_id
    ).first()
    if existing:
        return {"status": "duplicate", "activated": False, "event_id": event_id}

    event = models.WebhookEvent(
        provider=provider,
        event_id=event_id,
        transaction_id=data["transaction_id"] or None,
        amount=_safe_float(data["amount"]),
        currency=data["currency"],
        raw_payload=(raw_body.decode("utf-8", "replace")[:5000] if raw_body else None),
        status="received",
    )
    db.add(event)

    # ── Signature gate (dormant until EVC_WEBHOOK_SECRET is set) ─────────────
    sig_valid = verify_signature(raw_body, signature)
    event.signature_valid = sig_valid
    if not sig_valid:
        event.status = "unverified" if not signature_configured() else "invalid_signature"
        event.error = (
            "Webhook secret not configured — activation disabled."
            if not signature_configured()
            else "Signature verification failed."
        )
        db.commit()
        return {"status": event.status, "activated": False, "event_id": event_id}

    # ── Full validation chain (all must pass to activate) ───────────────────
    reason = _validate(db, data)
    if reason:
        event.status = "rejected"
        event.error = reason
        db.commit()
        return {"status": "rejected", "activated": False, "reason": reason, "event_id": event_id}

    user = db.query(models.User).filter(models.User.id == int(data["user_id"])).first()
    _activate_subscription(db, user, data["package_id"], _safe_float(data["amount"]), data["transaction_id"])
    _approve_matching_submission(db, user, data, provider, event_id)
    event.status = "processed"
    event.processed = True
    # System audit entry (admin=None): automatic activations must be traceable
    # in the same audit log admins already review.
    log_admin_action(
        db,
        admin=None,
        action_type="payment_auto_activated_webhook",
        target_type="user",
        target_id=user.id,
        new_value={
            "provider": provider,
            "package_id": data["package_id"],
            "amount": _safe_float(data["amount"]),
            "transaction_id": data["transaction_id"],
            "event_id": event_id,
        },
    )
    db.commit()
    return {"status": "processed", "activated": True, "event_id": event_id}


def _approve_matching_submission(db: Session, user: models.User, data: dict, provider: str, event_id: str) -> None:
    """
    Close the loop with the student's UI: the checkout page polls its pending
    PaymentSubmission, so a verified webhook must mark it approved. Prefer an
    exact transaction-id match, else the newest pending request for the same
    user + package.
    """
    txn = data["transaction_id"]
    pending_q = db.query(models.PaymentSubmission).filter(
        models.PaymentSubmission.user_id == user.id,
        models.PaymentSubmission.status.in_(["pending", "under_review"]),
    )
    submission = pending_q.filter(models.PaymentSubmission.transaction_id == txn).first()
    if not submission:
        submission = (
            pending_q.filter(models.PaymentSubmission.package_id == data["package_id"])
            .order_by(models.PaymentSubmission.id.desc())
            .first()
        )
    if not submission:
        return
    submission.status = "approved"
    submission.transaction_status = "paid"
    submission.admin_note = f"Auto-approved by verified {provider} webhook (event {event_id})."
    if txn:
        submission.transaction_id = txn


def _validate(db: Session, data: dict) -> Optional[str]:
    """Return None if valid, else a human-readable rejection reason."""
    if map_provider_status(str(data["status"])) != "successful":
        return "Payment status is not successful."

    txn = data["transaction_id"]
    if not txn:
        return "Missing transaction id."
    # Duplicate transaction protection across subscriptions, submissions, events.
    # A PENDING submission with this txn is the payment being confirmed right
    # now (it gets auto-approved after activation) — only an already-approved
    # submission means the transaction was reused.
    if db.query(models.UserSubscription).filter(models.UserSubscription.transaction_id == txn).first():
        return "Transaction id already used for an active subscription."
    if db.query(models.PaymentSubmission).filter(
        models.PaymentSubmission.transaction_id == txn,
        models.PaymentSubmission.status == "approved",
    ).first():
        return "Transaction id already used for an approved payment submission."

    currency = (data["currency"] or "").upper()
    if currency != "USD":
        return f"Unsupported currency: {currency}."

    package_id = data["package_id"]
    expected = _expected_price(db, package_id, data["billing_cycle"])
    if expected is None:
        return f"Unknown package/billing cycle: {package_id}/{data['billing_cycle']}."
    amount = _safe_float(data["amount"])
    if amount is None or round(amount, 2) != round(expected, 2):
        return "Amount does not match the official package price."

    if settings.EVC_MERCHANT_RECEIVER and str(data["receiver"]) != settings.EVC_MERCHANT_RECEIVER:
        return "Receiver/merchant account does not match."

    if not data["user_id"]:
        return "Missing user reference."
    user = db.query(models.User).filter(models.User.id == _safe_int(data["user_id"])).first()
    if not user:
        return "User not found for the provided reference."

    ts = _parse_timestamp(data["timestamp"])
    if ts is not None:
        age = (_utcnow() - ts).total_seconds()
        if age > _MAX_EVENT_AGE_SECONDS or age < -_MAX_EVENT_AGE_SECONDS:
            return "Payment timestamp is outside the accepted window."

    return None


def _safe_float(v) -> Optional[float]:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _safe_int(v) -> Optional[int]:
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _parse_timestamp(v) -> Optional[datetime.datetime]:
    if not v:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f"):
        try:
            return datetime.datetime.strptime(str(v)[:26], fmt)
        except ValueError:
            continue
    return None
