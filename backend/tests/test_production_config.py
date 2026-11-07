"""
Production safety tests. These run in SUBPROCESSES because the guards fire at
import time and depend on environment variables that differ from the dev suite.
"""
import os
import pathlib
import subprocess
import sys

BACKEND = pathlib.Path(__file__).resolve().parents[1]


def _run(env_extra, code):
    env = os.environ.copy()
    env["PYTHONPATH"] = str(BACKEND)
    env.update(env_extra)
    return subprocess.run(
        [sys.executable, "-c", code],
        cwd=str(BACKEND), env=env, capture_output=True, text=True,
    )


def test_production_default_secret_key_fails_startup():
    res = _run(
        {
            "ENVIRONMENT": "production",
            "SECRET_KEY": "super-secret-key-change-in-production",
            "DATABASE_URL": "sqlite:////tmp/should_not_connect.db",
        },
        "import app.config",
    )
    assert res.returncode != 0
    assert "Refusing to start" in (res.stderr + res.stdout)


_SCRIPT_503 = r'''
import os, tempfile, pathlib, uuid
tmp = pathlib.Path(tempfile.gettempdir()) / ("somprep_prodtest_%s" % uuid.uuid4().hex[:8])
tmp.mkdir(parents=True, exist_ok=True)
os.environ["ENVIRONMENT"] = "production"
os.environ["SECRET_KEY"] = "strong-production-key-0123456789abcdef"
os.environ["DATABASE_URL"] = "sqlite:///%s" % ((tmp / "p.db").as_posix())
os.environ["RECEIPT_STORAGE_PATH"] = str(tmp / "r")
os.environ["CORS_ALLOWED_ORIGINS"] = "https://somprep.example"
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app import models
from app.utils.auth import get_password_hash
db = SessionLocal()
u = models.User(phone_number="615559999", full_name="Prod User",
                hashed_password=get_password_hash("secret1"), role="student",
                grade_level=12, package_type="academic")
account = models.PaymentAccount(method_type="evc_plus", account_name="Hormuud Merchant",
                receiving_number="+252 61 2709412", instructions="Pay merchant",
                is_recommended=True, mode="api", api_status="live")
db.add(u); db.add(account); db.commit(); db.refresh(account); account_id = account.id; db.close()
c = TestClient(app)
t = c.post("/api/auth/login", json={"phone_number": "615559999", "password": "secret1"}).json()["access_token"]
h = {"Authorization": "Bearer %s" % t}
r = c.post("/api/payments_system/submit-api", headers=h, json={
    "package_id": "academic", "package_name": "Academic", "package_price": 7.5,
    "package_duration_months": 12, "payment_method": "evc_plus",
    "sender_phone": "615559999", "admin_receiving_account": "+252 61 2709412",
    "payment_account_id": account_id, "currency": "USD"})
assert r.status_code == 503, r.status_code
print("OK503")
'''


def test_api_mode_blocked_in_production():
    res = _run({}, _SCRIPT_503)
    assert "OK503" in res.stdout, res.stderr
