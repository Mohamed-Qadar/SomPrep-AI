"""Payment flow, receipt, and security tests."""
from tests.conftest import png_bytes, activate_via_manual_payment


MERCHANT_PHONE = "+252 61 2709412"


def create_payment_account(client, admin_headers, mode="manual", api_status="disabled", receiving_number=MERCHANT_PHONE):
    r = client.post("/api/payments_system/admin/accounts", headers=admin_headers, json={
        "method_type": "evc_plus",
        "account_name": "Hormuud Merchant",
        "receiving_number": receiving_number,
        "instructions": "Pay merchant",
        "is_recommended": True,
        "mode": mode,
        "api_status": api_status,
    })
    assert r.status_code == 200, r.text
    return r.json()


def test_upload_valid_receipt_returns_key(client, make_student):
    _, h = make_student()
    r = client.post("/api/payments_system/upload-receipt",
                    files={"file": ("r.png", png_bytes(), "image/png")}, headers=h)
    assert r.status_code == 200
    key = r.json()["file_key"]
    assert len(key) == 64 + 4 and key.endswith(".png")


def test_upload_invalid_file_rejected(client, make_student):
    _, h = make_student()
    r = client.post("/api/payments_system/upload-receipt",
                    files={"file": ("x.txt", b"not an image", "text/plain")}, headers=h)
    assert r.status_code == 400


def test_manual_submission_succeeds(client, make_student, admin_headers):
    create_payment_account(client, admin_headers)
    _, h = make_student()
    up = client.post("/api/payments_system/upload-receipt",
                     files={"file": ("r.png", png_bytes() + b"dup-test", "image/png")}, headers=h)
    key = up.json()["file_key"]
    r = client.post("/api/payments_system/submit-manual", headers=h, json={
        "package_id": "academic", "package_name": "Academic", "package_price": 7.5,
        "package_duration_months": 12, "payment_method": "evc_plus",
        "admin_receiving_account": MERCHANT_PHONE, "sender_phone": "615551111",
        "amount_paid": 7.5, "currency": "USD", "transaction_id": "TXN-M-100",
        "screenshot_url": key,
    })
    assert r.status_code == 200
    assert r.json()["status"] == "pending"


def test_duplicate_transaction_rejected(client, make_student, admin_headers):
    create_payment_account(client, admin_headers)
    _, h = make_student()
    up = client.post("/api/payments_system/upload-receipt",
                     files={"file": ("r.png", png_bytes(), "image/png")}, headers=h)
    payload = {
        "package_id": "academic", "package_name": "Academic", "package_price": 7.5,
        "package_duration_months": 12, "payment_method": "evc_plus",
        "admin_receiving_account": MERCHANT_PHONE, "sender_phone": "615552222",
        "amount_paid": 7.5, "currency": "USD", "transaction_id": "TXN-DUP-1",
        "screenshot_url": up.json()["file_key"],
    }
    first = client.post("/api/payments_system/submit-manual", headers=h, json=payload)
    assert first.status_code == 200
    dup = client.post("/api/payments_system/submit-manual", headers=h, json=payload)
    assert dup.status_code == 400


def test_receipt_access_control(client, make_student, admin_headers):
    _, owner = make_student()
    _, other = make_student()
    sub_id, _ = activate_via_manual_payment(client, owner, admin_headers, txn="TXN-RC-1")

    assert client.get(f"/api/payments_system/receipt/{sub_id}", headers=owner).status_code == 200
    assert client.get(f"/api/payments_system/receipt/{sub_id}", headers=other).status_code == 403
    assert client.get(f"/api/payments_system/receipt/{sub_id}", headers=admin_headers).status_code == 200


def test_admin_approval_activates_subscription(client, make_student, admin_headers):
    _, h = make_student()
    activate_via_manual_payment(client, h, admin_headers, txn="TXN-ACT-2")
    status = client.get("/api/payments/status", headers=h)
    assert status.status_code == 200
    assert status.json()["is_active"] is True


def test_manual_payment_request_does_not_activate_package(client, make_student, admin_headers):
    create_payment_account(client, admin_headers)
    _, h = make_student()
    up = client.post("/api/payments_system/upload-receipt",
                     files={"file": ("r.png", png_bytes() + b"pending-lock", "image/png")}, headers=h)
    r = client.post("/api/payments_system/submit-manual", headers=h, json={
        "package_id": "academic", "package_name": "Academic", "package_price": 7.5,
        "package_duration_months": 12, "payment_method": "evc_plus",
        "admin_receiving_account": MERCHANT_PHONE, "sender_phone": "615551234",
        "amount_paid": 7.5, "currency": "USD", "transaction_id": "TXN-PENDING-LOCK",
        "screenshot_url": up.json()["file_key"],
    })
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "pending"
    assert body["transaction_status"] == "pending"
    assert body["payer_phone"] == "615551234"
    assert body["merchant_phone"] == MERCHANT_PHONE

    status = client.get("/api/payments/status", headers=h)
    assert status.status_code == 200
    assert status.json()["is_active"] is False


def test_rejected_payment_does_not_grant_access(client, make_student, admin_headers):
    create_payment_account(client, admin_headers)
    _, h = make_student()
    up = client.post("/api/payments_system/upload-receipt",
                     files={"file": ("r.png", png_bytes() + b"reject-lock", "image/png")}, headers=h)
    r = client.post("/api/payments_system/submit-manual", headers=h, json={
        "package_id": "academic", "package_name": "Academic", "package_price": 7.5,
        "package_duration_months": 12, "payment_method": "evc_plus",
        "admin_receiving_account": MERCHANT_PHONE, "sender_phone": "615551235",
        "amount_paid": 7.5, "currency": "USD", "transaction_id": "TXN-REJECT-LOCK",
        "screenshot_url": up.json()["file_key"],
    })
    assert r.status_code == 200
    sub_id = r.json()["id"]

    rejected = client.post(
        f"/api/payments_system/admin/submissions/{sub_id}/resolve",
        headers=admin_headers,
        json={"action": "reject", "admin_note": "not received", "rejection_reason": "Not found in merchant account"},
    )
    assert rejected.status_code == 200

    status = client.get("/api/payments/status", headers=h)
    assert status.status_code == 200
    assert status.json()["is_active"] is False


def test_api_payment_request_stays_pending_and_locked(client, make_student, admin_headers):
    account = create_payment_account(client, admin_headers, mode="api", api_status="test")
    _, h = make_student()
    r = client.post("/api/payments_system/submit-api", headers=h, json={
        "package_id": "office-skills", "package_name": "Office Skills", "package_price": 3.0,
        "package_duration_months": 12, "payment_method": "evc_plus",
        "admin_receiving_account": MERCHANT_PHONE, "sender_phone": "615551236",
        "payment_account_id": account["id"], "currency": "USD",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "pending"
    assert body["transaction_status"] == "pending"
    assert body["payer_phone"] == "615551236"
    assert body["merchant_phone"] == MERCHANT_PHONE
    assert body["payment_account_id"] is not None

    status = client.get("/api/payments/status", headers=h)
    assert status.status_code == 200
    assert status.json()["is_active"] is False


def test_live_like_evc_request_creates_pending_transaction(client, make_student, admin_headers):
    account = create_payment_account(client, admin_headers, mode="api", api_status="test")
    _, h = make_student()
    r = client.post("/api/payments_system/submit-api", headers=h, json={
        "package_id": "academic", "package_name": "Academic", "package_price": 7.5,
        "package_duration_months": 12, "payment_method": "evc_plus",
        "admin_receiving_account": MERCHANT_PHONE, "sender_phone": "615551238",
        "payment_account_id": account["id"], "currency": "USD",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "pending"
    assert body["transaction_status"] == "pending"
    assert body["payer_phone"] == "615551238"
    assert body["merchant_phone"] == MERCHANT_PHONE

    status = client.get("/api/payments/status", headers=h)
    assert status.status_code == 200
    assert status.json()["is_active"] is False


def test_live_api_account_rejected_when_sandbox_mode_is_on(client, make_student, admin_headers):
    account = create_payment_account(client, admin_headers, mode="api", api_status="live")
    _, h = make_student()
    r = client.post("/api/payments_system/submit-api", headers=h, json={
        "package_id": "academic", "package_name": "Academic", "package_price": 7.5,
        "package_duration_months": 12, "payment_method": "evc_plus",
        "admin_receiving_account": MERCHANT_PHONE, "sender_phone": "615551239",
        "payment_account_id": account["id"], "currency": "USD",
    })
    assert r.status_code == 503
    assert "EVC_SANDBOX_MODE=false" in r.json()["detail"]


def test_invalid_package_rejected(client, make_student):
    _, h = make_student()
    r = client.post("/api/payments_system/submit-api", headers=h, json={
        "package_id": "not-a-package", "package_name": "Missing", "package_price": 2.5,
        "package_duration_months": 12, "payment_method": "evc_plus",
        "admin_receiving_account": MERCHANT_PHONE, "sender_phone": "615551240",
        "currency": "USD",
    })
    assert r.status_code == 400
    assert "Invalid or inactive package slug" in r.json()["detail"]


def test_invalid_amount_rejected(client, make_student, admin_headers):
    account = create_payment_account(client, admin_headers, mode="api", api_status="test")
    _, h = make_student()
    r = client.post("/api/payments_system/submit-api", headers=h, json={
        "package_id": "academic", "package_name": "Academic", "package_price": 0,
        "package_duration_months": 12, "payment_method": "evc_plus",
        "admin_receiving_account": MERCHANT_PHONE, "sender_phone": "615551241",
        "payment_account_id": account["id"], "currency": "USD",
    })
    assert r.status_code == 400
    assert "Amount does not match" in r.json()["detail"]


def test_missing_merchant_account_rejected(client, make_student):
    _, h = make_student()
    missing_merchant = "+252 61 9999999"
    r = client.post("/api/payments_system/submit-api", headers=h, json={
        "package_id": "academic", "package_name": "Academic", "package_price": 7.5,
        "package_duration_months": 12, "payment_method": "evc_plus",
        "admin_receiving_account": missing_merchant, "sender_phone": "615551242",
        "currency": "USD",
    })
    assert r.status_code == 404


def test_verified_evc_confirm_grants_access_only_after_confirm(client, make_student, admin_headers):
    _, h = make_student(pkg="academic", grade=12)
    created = client.post("/api/payment/evc-plus", headers=h, json={
        "package_id": "academic",
        "billing_cycle": "annual",
        "amount": 7.5,
        "currency": "USD",
        "evc_phone": "615551237",
    })
    assert created.status_code == 200, created.text
    assert created.json()["status"] == "pending"

    before = client.get("/api/payments/status", headers=h)
    assert before.status_code == 200
    assert before.json()["is_active"] is False

    confirmed = client.post("/api/payment/evc-plus/confirm", headers=admin_headers, json={
        "transaction_id": created.json()["transaction_id"],
    })
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()["is_active"] is True

    after = client.get("/api/payments/status", headers=h)
    assert after.status_code == 200
    assert after.json()["is_active"] is True


def test_admin_manual_confirmation_grants_access(client, make_student, admin_headers):
    _, h = make_student()
    sub_id, _ = activate_via_manual_payment(client, h, admin_headers, txn="TXN-MANUAL-CONFIRM")
    submission = client.get(f"/api/payments_system/status/{sub_id}", headers=h)
    assert submission.status_code == 200
    assert submission.json()["status"] == "approved"
    assert submission.json()["transaction_status"] == "approved"

    status = client.get("/api/payments/status", headers=h)
    assert status.status_code == 200
    assert status.json()["is_active"] is True


def test_student_payer_phone_cannot_be_merchant_number(client, make_student, admin_headers):
    account = create_payment_account(client, admin_headers, mode="api", api_status="test")
    _, h = make_student()
    r = client.post("/api/payments_system/submit-api", headers=h, json={
        "package_id": "academic", "package_name": "Academic", "package_price": 7.5,
        "package_duration_months": 12, "payment_method": "evc_plus",
        "admin_receiving_account": MERCHANT_PHONE,
        "sender_phone": MERCHANT_PHONE,
        "payment_account_id": account["id"], "currency": "USD",
    })
    assert r.status_code == 400
    assert "Payer phone cannot be the merchant receiving number" in r.json()["detail"]


def test_methods_do_not_leak_secrets(client, make_student, admin_headers):
    client.post("/api/payments_system/admin/accounts", headers=admin_headers, json={
        "method_type": "evc_plus", "account_name": "Hormuud", "receiving_number": "611111111",
        "instructions": "Send to 611111111", "is_recommended": True, "mode": "manual",
        "api_key": "SECRET_KEY_123", "api_secret": "SUPER_SECRET",
    })
    _, h = make_student()
    res = client.get("/api/payments_system/methods", headers=h)
    assert res.status_code == 200
    for m in res.json():
        assert "api_key" not in m and "api_secret" not in m


def test_legacy_subscribe_endpoint_gone(client, make_student):
    _, h = make_student()
    r = client.post("/api/payments/subscribe", headers=h, json={"phone_number": "615550002"})
    assert r.status_code == 410


def test_login_rate_limit_returns_429(client):
    codes = [
        client.post("/api/auth/login", json={"phone_number": "x", "password": "y"}).status_code
        for _ in range(14)
    ]
    assert 429 in codes
