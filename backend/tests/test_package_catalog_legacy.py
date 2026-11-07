from types import SimpleNamespace

from app.api.package_catalog import to_package_out


def _legacy_plan(**overrides):
    base = {
        "id": 999,
        "slug": None,
        "name": "Legacy Package",
        "display_title": None,
        "category": "other",
        "audience": None,
        "target": None,
        "grade_range": "",
        "access_scope": "none",
        "price": 1.0,
        "monthly_price": None,
        "currency": "USD",
        "duration_months": 12,
        "features": "[]",
        "button_label": None,
        "details_path": None,
        "is_active": False,
        "sort_order": 100,
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def test_package_serializer_handles_legacy_null_slug():
    package = to_package_out(_legacy_plan(name="Primary Prep Bundle", id=123))

    assert package.slug == "primary-prep-bundle-123"
    assert package.name == "Primary Prep Bundle"


def test_admin_package_endpoint_returns_cors_header(admin_headers, client):
    response = client.get(
        "/api/packages/admin",
        headers={**admin_headers, "Origin": "http://127.0.0.1:3000"},
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:3000"
    assert all(item["slug"] for item in response.json())
