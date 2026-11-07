"""
Admin package catalog CRUD — create, update, deactivate (soft delete),
hard delete, and role protection.
"""
import uuid


def _pkg_payload(slug=None):
    slug = slug or f"pkg-{uuid.uuid4().hex[:8]}"
    return {
        "slug": slug,
        "name": f"Test Package {slug}",
        "display_title": "Test Package",
        "category": "academic",
        "audience": "Testers",
        "target": "Testing",
        "grade_range": "1-12",
        "access_scope": "academic",
        "annual_price": 9.99,
        "monthly_price": None,
        "currency": "USD",
        "duration_months": 12,
        "features": ["Feature A", "Feature B"],
        "button_label": "Get Test",
        "details_path": "",
        "is_active": True,
        "sort_order": 500,
    }


def _create(client, admin_headers, **overrides):
    payload = {**_pkg_payload(), **overrides}
    r = client.post("/api/packages/admin", headers=admin_headers, json=payload)
    assert r.status_code == 201, r.text
    return r.json()


def test_create_and_list_package(client, admin_headers):
    created = _create(client, admin_headers)
    listed = client.get("/api/packages/admin", headers=admin_headers).json()
    assert any(p["id"] == created["id"] for p in listed)
    # active package is publicly visible
    public = client.get("/api/packages").json()
    assert any(p["id"] == created["id"] for p in public)


def test_duplicate_slug_rejected(client, admin_headers):
    created = _create(client, admin_headers)
    r = client.post("/api/packages/admin", headers=admin_headers,
                    json={**_pkg_payload(), "slug": created["slug"]})
    assert r.status_code == 400


def test_update_package_price(client, admin_headers):
    created = _create(client, admin_headers)
    r = client.patch(f"/api/packages/admin/{created['id']}", headers=admin_headers,
                     json={"annual_price": 19.5})
    assert r.status_code == 200
    assert r.json()["annual_price"] == 19.5


def test_soft_delete_deactivates_package(client, admin_headers):
    created = _create(client, admin_headers)
    r = client.delete(f"/api/packages/admin/{created['id']}", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["is_active"] is False
    # no longer publicly visible
    public = client.get("/api/packages").json()
    assert all(p["id"] != created["id"] for p in public)


def test_hard_delete_removes_unreferenced_package(client, admin_headers):
    created = _create(client, admin_headers)
    r = client.delete(f"/api/packages/admin/{created['id']}?hard=true", headers=admin_headers)
    assert r.status_code == 200
    listed = client.get("/api/packages/admin", headers=admin_headers).json()
    assert all(p["id"] != created["id"] for p in listed)


def test_hard_delete_blocked_when_users_reference_package(client, admin_headers, make_student):
    # "secondary" is a default package that registration references
    make_student(pkg="secondary", grade=12)
    listed = client.get("/api/packages/admin", headers=admin_headers).json()
    secondary = next(p for p in listed if p["slug"] == "secondary")
    r = client.delete(f"/api/packages/admin/{secondary['id']}?hard=true", headers=admin_headers)
    assert r.status_code == 409


def test_delete_missing_package_404(client, admin_headers):
    r = client.delete("/api/packages/admin/999999", headers=admin_headers)
    assert r.status_code == 404


def test_student_cannot_manage_packages(client, admin_headers, make_student):
    _, student_headers = make_student()
    created = _create(client, admin_headers)
    assert client.post("/api/packages/admin", headers=student_headers,
                       json=_pkg_payload()).status_code == 403
    assert client.patch(f"/api/packages/admin/{created['id']}", headers=student_headers,
                        json={"annual_price": 1.0}).status_code == 403
    assert client.delete(f"/api/packages/admin/{created['id']}",
                         headers=student_headers).status_code == 403
