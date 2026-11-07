"""Every API response carries browser-protection headers; errors stay generic."""


def test_security_headers_present(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert r.headers["referrer-policy"] == "same-origin"
    assert "permissions-policy" in r.headers
    # Dev/test runs must NOT send HSTS (would poison plain-HTTP localhost).
    assert "strict-transport-security" not in r.headers


def test_headers_on_error_responses_too(client):
    r = client.get("/api/auth/me")  # unauthenticated -> 401
    assert r.status_code == 401
    assert r.headers["x-content-type-options"] == "nosniff"
