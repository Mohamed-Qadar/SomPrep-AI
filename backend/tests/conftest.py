"""
Pytest configuration & shared fixtures for SomPrep AI.

Uses an ISOLATED temporary SQLite database and an isolated receipt storage dir,
so running the suite never touches dev or production data. Environment is set
BEFORE importing the app so config picks it up.
"""
import os
import pathlib
import tempfile
import uuid

# ── Isolated environment (must be set before importing the app) ─────────────
_TMP = pathlib.Path(tempfile.gettempdir()) / f"somprep_test_{uuid.uuid4().hex[:8]}"
_TMP.mkdir(parents=True, exist_ok=True)

os.environ["ENVIRONMENT"] = "development"
os.environ["DATABASE_URL"] = f"sqlite:///{(_TMP / 'test.db').as_posix()}"
os.environ["SECRET_KEY"] = "test-secret-key-strong-enough-0123456789abcd"
os.environ["EVC_SANDBOX_MODE"] = "true"
os.environ["RECEIPT_STORAGE_PATH"] = str(_TMP / "receipts")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app import models  # noqa: E402
from app.utils.auth import get_password_hash  # noqa: E402


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    """Clear the in-memory rate limiter before each test to avoid cross-test bleed."""
    from app.utils import rate_limit
    rate_limit._HITS.clear()
    yield


def _rand_phone(prefix="61"):
    return f"{prefix}{uuid.uuid4().int % 10_000_000:07d}"


@pytest.fixture
def make_student(client):
    """Factory: register + login a student. Returns (phone, auth_headers)."""
    def _make(pkg="secondary", grade=12):
        phone = _rand_phone()
        r = client.post("/api/auth/register", json={
            "phone_number": phone,
            "full_name": "Test Student",
            "password": "secret1",
            "package_type": pkg,
            "grade_level": grade,
        })
        assert r.status_code == 201, r.text
        token = client.post("/api/auth/login", json={
            "phone_number": phone, "password": "secret1",
        }).json()["access_token"]
        return phone, {"Authorization": f"Bearer {token}"}
    return _make


@pytest.fixture
def admin_headers(client):
    """Create an admin directly in the DB and return auth headers."""
    phone = _rand_phone("610")
    db = SessionLocal()
    admin = models.User(
        phone_number=phone, full_name="Root Admin",
        hashed_password=get_password_hash("adminpass"), role="admin",
        grade_level=12, package_type=None,
    )
    db.add(admin)
    db.commit()
    db.close()
    token = client.post("/api/auth/admin/login", json={
        "phone_number": phone, "password": "adminpass",
    }).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def png_bytes():
    """A minimal byte blob with a valid PNG magic signature."""
    return b"\x89PNG\r\n\x1a\n" + b"0" * 256


def activate_via_manual_payment(client, student_headers, admin_headers, txn="TXN-ACT-1"):
    """Helper: full manual flow that ends with an active subscription."""
    client.post("/api/payments_system/admin/accounts", headers=admin_headers, json={
        "method_type": "evc_plus", "account_name": "Hormuud Merchant",
        "receiving_number": "+252 61 2709412", "instructions": "Pay merchant",
        "is_recommended": True, "mode": "manual", "api_status": "disabled",
    })
    receipt_blob = png_bytes() + txn.encode("utf-8")
    up = client.post("/api/payments_system/upload-receipt",
                     files={"file": ("r.png", receipt_blob, "image/png")},
                     headers=student_headers)
    file_key = up.json()["file_key"]
    sub = client.post("/api/payments_system/submit-manual", headers=student_headers, json={
        "package_id": "academic", "package_name": "Academic", "package_price": 7.5,
        "package_duration_months": 12, "payment_method": "evc_plus",
        "admin_receiving_account": "+252 61 2709412", "sender_phone": "615550000",
        "amount_paid": 7.5, "currency": "USD", "transaction_id": txn,
        "screenshot_url": file_key,
    })
    sub_id = sub.json()["id"]
    client.post(f"/api/payments_system/admin/submissions/{sub_id}/resolve",
                headers=admin_headers, json={"action": "approve", "admin_note": "ok"})
    return sub_id, file_key
