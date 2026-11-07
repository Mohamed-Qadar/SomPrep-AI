"""
Single-device login: each login rotates session_version, so only the most
recent device's token stays valid. Prevents one paid account being shared.
"""


def test_second_login_invalidates_first_token(client, make_student):
    phone, first_headers = make_student()

    # First device works
    assert client.get("/api/auth/me", headers=first_headers).status_code == 200

    # Same account logs in from a "second device"
    second_token = client.post("/api/auth/login", json={
        "phone_number": phone, "password": "secret1",
    }).json()["access_token"]
    second_headers = {"Authorization": f"Bearer {second_token}"}

    # New device works; old device is kicked out
    assert client.get("/api/auth/me", headers=second_headers).status_code == 200
    r = client.get("/api/auth/me", headers=first_headers)
    assert r.status_code == 401
    assert "another device" in r.json()["detail"]


def test_admin_second_login_invalidates_first_token(client, admin_headers):
    # admin_headers fixture performed the first login; log in again directly.
    me = client.get("/api/auth/me", headers=admin_headers).json()
    second_token = client.post("/api/auth/admin/login", json={
        "phone_number": me["phone_number"], "password": "adminpass",
    }).json()["access_token"]

    assert client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {second_token}"
    }).status_code == 200
    assert client.get("/api/auth/me", headers=admin_headers).status_code == 401
