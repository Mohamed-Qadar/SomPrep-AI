"""
Application-security regression tests for defects found in the strict review:

  * public registration cannot escalate to teacher/admin (privilege escalation);
  * registration rejects malformed phone numbers (input validation);
  * voucher redemption honours the voucher's own plan (not the user's pick);
  * voucher redemption is atomic (a code cannot be redeemed twice);
  * payment status endpoint blocks cross-user access (IDOR).
"""
import uuid

from app.database import SessionLocal
from app import models


def _rand_phone(prefix="61"):
    return f"{prefix}{uuid.uuid4().int % 10_000_000:07d}"


# ── Privilege escalation ─────────────────────────────────────────────────────

def test_registration_cannot_create_admin(client):
    phone = _rand_phone()
    r = client.post("/api/auth/register", json={
        "phone_number": phone, "full_name": "Sneaky Admin",
        "password": "secret1", "package_type": "secondary", "grade_level": 12,
        "role": "admin",
    })
    # Rejected outright by the schema pattern (role must be "student").
    assert r.status_code == 422, r.text


def test_registration_forces_student_role_even_if_omitted(client):
    phone = _rand_phone()
    r = client.post("/api/auth/register", json={
        "phone_number": phone, "full_name": "Normal Student",
        "password": "secret1", "package_type": "secondary", "grade_level": 12,
    })
    assert r.status_code == 201, r.text
    assert r.json()["role"] == "student"
    db = SessionLocal()
    user = db.query(models.User).filter(models.User.phone_number == phone).first()
    db.close()
    assert user.role == "student"


# ── Input validation ─────────────────────────────────────────────────────────

def test_registration_rejects_bad_phone(client):
    for bad in ["12345", "abcdefghi", "+1 202 555 0100", "251999999999"]:
        r = client.post("/api/auth/register", json={
            "phone_number": bad, "full_name": "Bad Phone",
            "password": "secret1", "package_type": "secondary", "grade_level": 12,
        })
        assert r.status_code == 422, f"{bad!r} should be rejected, got {r.status_code}"


def test_registration_accepts_valid_somali_formats(client):
    for good in [f"61{uuid.uuid4().int % 10_000_000:07d}",
                 f"+25277{uuid.uuid4().int % 10_000_000:07d}"]:
        r = client.post("/api/auth/register", json={
            "phone_number": good, "full_name": "Good Phone",
            "password": "secret1", "package_type": "secondary", "grade_level": 12,
        })
        assert r.status_code == 201, f"{good!r} should be accepted: {r.text}"


# ── Voucher correctness & atomicity ──────────────────────────────────────────

def _make_voucher(code, plan_slug="primary"):
    db = SessionLocal()
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.slug == plan_slug).first()
    v = models.Voucher(code=code, plan_id=plan.id, status="active")
    db.add(v)
    db.commit()
    db.close()


def test_voucher_grants_its_own_plan_not_users_choice(client, make_student):
    # Student registered under "academic" but redeems a "primary" voucher.
    phone, headers = make_student(pkg="academic", grade=12)
    code = f"VC-{uuid.uuid4().hex[:8]}"
    _make_voucher(code, plan_slug="primary")

    r = client.post("/api/payments/voucher-redeem", headers=headers, json={"code": code})
    assert r.status_code == 200, r.text

    me = client.get("/api/auth/me", headers=headers).json()
    assert me["package_type"] == "primary"    # voucher's plan wins, not "academic"
    assert me["grade_level"] in (1, 2, 3, 4)  # snapped into the plan's range

    # access_scope drives grade gating — assert it directly from the DB.
    db = SessionLocal()
    user = db.query(models.User).filter(models.User.phone_number == phone).first()
    scope = user.package_access_scope
    db.close()
    assert scope == "primary"


def test_voucher_cannot_be_redeemed_twice(client, make_student):
    code = f"VC-{uuid.uuid4().hex[:8]}"
    _make_voucher(code, plan_slug="secondary")

    _, first = make_student(pkg="secondary", grade=12)
    assert client.post("/api/payments/voucher-redeem", headers=first, json={"code": code}).status_code == 200

    _, second = make_student(pkg="secondary", grade=12)
    r = client.post("/api/payments/voucher-redeem", headers=second, json={"code": code})
    assert r.status_code == 400
    assert "used" in r.json()["detail"].lower() or "isticmaalay" in r.json()["detail"]


def test_voucher_unknown_code_rejected(client, make_student):
    _, headers = make_student()
    r = client.post("/api/payments/voucher-redeem", headers=headers, json={"code": "DOES-NOT-EXIST"})
    assert r.status_code == 400


# ── IDOR: cross-user payment status ──────────────────────────────────────────

def test_payment_status_blocks_other_students(client, make_student, admin_headers):
    # Student A creates a manual submission.
    from tests.conftest import png_bytes
    phone_a, a = make_student(pkg="academic", grade=12)
    client.post("/api/payments_system/admin/accounts", headers=admin_headers, json={
        "method_type": "evc_plus", "account_name": "M", "receiving_number": "+252 61 2709412",
        "instructions": "pay", "is_recommended": True, "mode": "manual", "api_status": "disabled",
    })
    up = client.post("/api/payments_system/upload-receipt",
                     files={"file": ("r.png", png_bytes() + b"idor", "image/png")}, headers=a)
    sub = client.post("/api/payments_system/submit-manual", headers=a, json={
        "package_id": "academic", "package_name": "Academic", "package_price": 7.5,
        "package_duration_months": 12, "payment_method": "evc_plus",
        "admin_receiving_account": "+252 61 2709412", "sender_phone": "615551234",
        "amount_paid": 7.5, "currency": "USD", "transaction_id": f"TXN-IDOR-{uuid.uuid4().hex[:6]}",
        "screenshot_url": up.json()["file_key"],
    })
    sub_id = sub.json()["id"]

    # Student B cannot read it; owner can.
    _, b = make_student(pkg="academic", grade=12)
    assert client.get(f"/api/payments_system/status/{sub_id}", headers=b).status_code == 403
    assert client.get(f"/api/payments_system/status/{sub_id}", headers=a).status_code == 200
    # Admin can (support/monitoring).
    assert client.get(f"/api/payments_system/status/{sub_id}", headers=admin_headers).status_code == 200
