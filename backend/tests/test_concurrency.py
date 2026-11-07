"""
Concurrency defects found by adversarial load testing.

A duplicate-transaction guard that only does check-then-insert is not race
safe: two simultaneous submits with the same transaction id both pass the
SELECT, then one INSERT wins and the other hits the DB unique constraint. The
loser must get a clean 400, never an unhandled 500.
"""
import threading
import uuid

from tests.conftest import png_bytes


def _setup_account(client, admin_headers):
    client.post("/api/payments_system/admin/accounts", headers=admin_headers, json={
        "method_type": "evc_plus", "account_name": "Race Merchant",
        "receiving_number": "+252 61 2709412", "instructions": "pay",
        "is_recommended": True, "mode": "manual", "api_status": "disabled",
    })


def test_concurrent_duplicate_submit_returns_clean_400_not_500(client, make_student, admin_headers):
    _setup_account(client, admin_headers)
    phone, headers = make_student(pkg="secondary", grade=12)
    fk = client.post("/api/payments_system/upload-receipt",
                     files={"file": ("r.png", png_bytes() + uuid.uuid4().bytes, "image/png")},
                     headers=headers).json()["file_key"]
    txn = f"TXN-RACE-{uuid.uuid4().hex[:8]}"
    body = {
        "package_id": "secondary", "package_name": "Secondary", "package_price": 2.5,
        "package_duration_months": 12, "payment_method": "evc_plus",
        "admin_receiving_account": "+252 61 2709412", "sender_phone": "615550000",
        "amount_paid": 2.5, "currency": "USD", "transaction_id": txn, "screenshot_url": fk,
    }

    codes = []
    barrier = threading.Barrier(2)

    def submit():
        barrier.wait()  # release both threads at the same instant
        r = client.post("/api/payments_system/submit-manual", headers=headers, json=body)
        codes.append(r.status_code)

    threads = [threading.Thread(target=submit) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # Exactly one wins; the loser is a clean 400 — never a 500.
    assert sorted(codes) == [200, 400], f"expected [200, 400], got {sorted(codes)}"
    assert 500 not in codes
