"""
End-to-end automatic payment flow:

  student creates a pending payment request
  → provider sends a signed webhook
  → backend verifies signature + amount + package + txn + user
  → subscription activates AND the pending submission flips to approved
    (so the checkout page's polling unlocks access instantly, no admin).
"""
import datetime
import hashlib
import hmac
import json

import pytest

from app.config import settings
from app.database import SessionLocal
from app import models

SECRET = "test-webhook-secret-0123456789"


@pytest.fixture
def webhook_secret():
    old = settings.EVC_WEBHOOK_SECRET
    settings.EVC_WEBHOOK_SECRET = SECRET
    yield
    settings.EVC_WEBHOOK_SECRET = old


def _signed(body: dict):
    raw = json.dumps(body).encode("utf-8")
    sig = hmac.new(SECRET.encode("utf-8"), raw, hashlib.sha256).hexdigest()
    return raw, {"x-signature": f"sha256={sig}", "Content-Type": "application/json"}


def _webhook_body(user_id, txn="TXN-WH-1", amount=7.5, package="academic"):
    return {
        "event_id": f"evt-{txn}",
        "transaction_id": txn,
        "amount": amount,
        "currency": "USD",
        "status": "success",
        "user_id": user_id,
        "package_id": package,
        "billing_cycle": "annual",
        "timestamp": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
    }


def _user_id(phone):
    db = SessionLocal()
    uid = db.query(models.User).filter(models.User.phone_number == phone).first().id
    db.close()
    return uid


def test_unsigned_webhook_never_activates(client, make_student):
    phone, headers = make_student(pkg="academic", grade=12)
    body = _webhook_body(_user_id(phone))
    r = client.post("/api/webhooks/waafipay", content=json.dumps(body))
    assert r.json()["activated"] is False
    me = client.get("/api/auth/me", headers=headers).json()
    assert me["package_active"] is False


def test_signed_webhook_activates_and_approves_pending_submission(
    client, make_student, admin_headers, webhook_secret
):
    phone, headers = make_student(pkg="academic", grade=12)
    uid = _user_id(phone)

    # Student creates a pending payment request (manual account from helper).
    from tests.conftest import png_bytes
    client.post("/api/payments_system/admin/accounts", headers=admin_headers, json={
        "method_type": "evc_plus", "account_name": "Hormuud Merchant",
        "receiving_number": "+252 61 2709412", "instructions": "Pay merchant",
        "is_recommended": True, "mode": "manual", "api_status": "disabled",
    })
    up = client.post("/api/payments_system/upload-receipt",
                     files={"file": ("r.png", png_bytes() + b"wh", "image/png")},
                     headers=headers)
    sub = client.post("/api/payments_system/submit-manual", headers=headers, json={
        "package_id": "academic", "package_name": "Academic", "package_price": 7.5,
        "package_duration_months": 12, "payment_method": "evc_plus",
        "admin_receiving_account": "+252 61 2709412", "sender_phone": "615550001",
        "amount_paid": 7.5, "currency": "USD", "transaction_id": "TXN-WH-2",
        "screenshot_url": up.json()["file_key"],
    })
    sub_id = sub.json()["id"]
    assert sub.json()["status"] == "pending"

    # Provider confirms the SAME transaction via signed webhook.
    raw, hdrs = _signed(_webhook_body(uid, txn="TXN-WH-2"))
    r = client.post("/api/webhooks/waafipay", content=raw, headers=hdrs)
    assert r.json() == {"received": True, "status": "processed", "activated": True}

    # Subscription is active and the pending submission auto-approved.
    me = client.get("/api/auth/me", headers=headers).json()
    assert me["package_active"] is True
    status = client.get(f"/api/payments_system/status/{sub_id}", headers=headers).json()
    assert status["status"] == "approved"

    # Replay protection: the same event is idempotent.
    r2 = client.post("/api/webhooks/waafipay", content=raw, headers=hdrs)
    assert r2.json()["status"] == "duplicate"
    assert r2.json()["activated"] is False

    # Automatic activation leaves a system audit-log entry.
    db = SessionLocal()
    entry = (
        db.query(models.AdminActionLog)
        .filter(
            models.AdminActionLog.action_type == "payment_auto_activated_webhook",
            models.AdminActionLog.target_id == str(uid),
        )
        .first()
    )
    db.close()
    assert entry is not None
    assert "TXN-WH-2" in (entry.new_value or "")


def test_wrong_amount_rejected(client, make_student, webhook_secret):
    phone, headers = make_student(pkg="academic", grade=12)
    raw, hdrs = _signed(_webhook_body(_user_id(phone), txn="TXN-WH-3", amount=0.01))
    r = client.post("/api/webhooks/waafipay", content=raw, headers=hdrs)
    assert r.json()["activated"] is False
    assert r.json()["status"] == "rejected"
    me = client.get("/api/auth/me", headers=headers).json()
    assert me["package_active"] is False
