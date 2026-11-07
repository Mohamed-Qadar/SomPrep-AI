from app import models
from app.database import SessionLocal
from app.utils.auth import get_password_hash


def _create_admin(phone="+252610009999", password="OldAdmin123"):
    db = SessionLocal()
    admin = models.User(
        phone_number=phone,
        full_name="Reset Admin",
        hashed_password=get_password_hash(password),
        role="admin",
        grade_level=12,
        package_type=None,
    )
    db.add(admin)
    db.commit()
    admin_id = admin.id
    db.close()
    return admin_id


def test_admin_must_use_separate_admin_login(client):
    phone = "+252610009998"
    _create_admin(phone=phone, password="AdminOnly123")

    student_login = client.post(
        "/api/auth/login",
        json={"phone_number": phone, "password": "AdminOnly123"},
    )
    assert student_login.status_code == 403
    assert "loginasadmin" in student_login.json()["detail"]

    admin_login = client.post(
        "/api/auth/admin/login",
        json={"phone_number": phone, "password": "AdminOnly123"},
    )
    assert admin_login.status_code == 200
    token = admin_login.json()["access_token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["role"] == "admin"


def test_admin_password_reset_invalidates_old_sessions(client):
    phone = "+252610009997"
    admin_id = _create_admin(phone=phone, password="OldAdmin123")

    login = client.post(
        "/api/auth/admin/login",
        json={"phone_number": phone, "password": "OldAdmin123"},
    )
    assert login.status_code == 200
    old_token = login.json()["access_token"]

    request_reset = client.post(
        "/api/auth/admin/password-reset/request",
        json={"phone_number": phone, "channel": "sms"},
    )
    assert request_reset.status_code == 200
    reset_payload = request_reset.json()
    assert reset_payload["debug_otp"]

    verify = client.post(
        "/api/auth/admin/password-reset/verify",
        json={"reset_id": reset_payload["reset_id"], "otp": reset_payload["debug_otp"]},
    )
    assert verify.status_code == 200

    weak_password = client.post(
        "/api/auth/admin/password-reset/confirm",
        json={
            "reset_id": reset_payload["reset_id"],
            "reset_token": verify.json()["reset_token"],
            "new_password": "short",
        },
    )
    assert weak_password.status_code == 422

    confirm = client.post(
        "/api/auth/admin/password-reset/confirm",
        json={
            "reset_id": reset_payload["reset_id"],
            "reset_token": verify.json()["reset_token"],
            "new_password": "NewAdmin123",
        },
    )
    assert confirm.status_code == 200

    old_session = client.get("/api/auth/me", headers={"Authorization": f"Bearer {old_token}"})
    assert old_session.status_code == 401

    old_password = client.post(
        "/api/auth/admin/login",
        json={"phone_number": phone, "password": "OldAdmin123"},
    )
    assert old_password.status_code == 401

    new_password = client.post(
        "/api/auth/admin/login",
        json={"phone_number": phone, "password": "NewAdmin123"},
    )
    assert new_password.status_code == 200

    db = SessionLocal()
    admin = db.query(models.User).filter(models.User.id == admin_id).first()
    reset_log = db.query(models.AdminActionLog).filter(
        models.AdminActionLog.admin_id == admin_id,
        models.AdminActionLog.action_type == "admin_password_reset_completed",
    ).first()
    db.close()

    assert admin.admin_session_version == 1
    assert admin.password_changed_at is not None
    assert reset_log is not None
