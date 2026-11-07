"""
Teacher LMS: course/chapter/lesson CRUD, lesson file upload, analytics,
student roster, and the student-side access rules (published + grade +
active package only).
"""
import uuid

import pytest

from tests.conftest import activate_via_manual_payment, png_bytes


@pytest.fixture
def teacher_headers(client, admin_headers):
    phone = f"61{uuid.uuid4().int % 10_000_000:07d}"
    r = client.post("/api/admin/create-teacher", headers=admin_headers, json={
        "phone_number": phone, "full_name": "LMS Teacher",
        "password": "teachpass1", "subject": "Physics",
        "teacher_package_scope": "academic",
    })
    assert r.status_code == 201, r.text
    token = client.post("/api/auth/login", json={
        "phone_number": phone, "password": "teachpass1",
    }).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _build_course(client, teacher_headers, grade=12, publish=True):
    course = client.post("/api/teacher/courses", headers=teacher_headers, json={
        "title": "Physics Masterclass", "description": "Full prep",
        "subject": "Physics", "grade_level": grade, "is_published": publish,
    }).json()
    chapter = client.post(f"/api/teacher/courses/{course['id']}/chapters",
                          headers=teacher_headers, json={"title": "Mechanics", "sort_order": 1}).json()
    lesson = client.post(f"/api/teacher/chapters/{chapter['id']}/lessons",
                         headers=teacher_headers, json={
                             "title": "Newton's Laws", "lesson_type": "video",
                             "content_url": "https://youtu.be/example", "duration_minutes": 12,
                         }).json()
    return course, chapter, lesson


def test_course_crud_and_structure(client, teacher_headers):
    course, chapter, lesson = _build_course(client, teacher_headers)
    listed = client.get("/api/teacher/courses", headers=teacher_headers).json()
    mine = next(c for c in listed if c["id"] == course["id"])
    assert mine["chapters"][0]["title"] == "Mechanics"
    assert mine["chapters"][0]["lessons"][0]["title"] == "Newton's Laws"

    # Update + delete lesson
    upd = client.patch(f"/api/teacher/lessons/{lesson['id']}", headers=teacher_headers,
                       json={"title": "Newton's Laws (v2)"})
    assert upd.json()["title"] == "Newton's Laws (v2)"
    assert client.delete(f"/api/teacher/lessons/{lesson['id']}", headers=teacher_headers).status_code == 204
    assert client.delete(f"/api/teacher/courses/{course['id']}", headers=teacher_headers).status_code == 204


def test_lesson_file_upload_and_type_validation(client, teacher_headers):
    course, chapter, lesson = _build_course(client, teacher_headers)
    ok = client.post(f"/api/teacher/lessons/{lesson['id']}/file", headers=teacher_headers,
                     files={"file": ("notes.png", png_bytes(), "image/png")})
    assert ok.status_code == 200, ok.text
    assert ok.json()["original_filename"] == "notes.png"
    bad = client.post(f"/api/teacher/lessons/{lesson['id']}/file", headers=teacher_headers,
                      files={"file": ("virus.exe", b"MZ", "application/octet-stream")})
    assert bad.status_code == 400


def test_teacher_cannot_touch_another_teachers_course(client, teacher_headers, admin_headers):
    course, chapter, lesson = _build_course(client, teacher_headers)

    phone = f"61{uuid.uuid4().int % 10_000_000:07d}"
    client.post("/api/admin/create-teacher", headers=admin_headers, json={
        "phone_number": phone, "full_name": "Other Teacher",
        "password": "teachpass2", "teacher_package_scope": "academic",
    })
    other_token = client.post("/api/auth/login", json={
        "phone_number": phone, "password": "teachpass2",
    }).json()["access_token"]
    other = {"Authorization": f"Bearer {other_token}"}

    assert client.patch(f"/api/teacher/courses/{course['id']}", headers=other,
                        json={"title": "hijack"}).status_code == 404
    assert client.delete(f"/api/teacher/lessons/{lesson['id']}", headers=other).status_code == 404


def test_student_access_rules(client, teacher_headers, admin_headers, make_student):
    course, chapter, lesson = _build_course(client, teacher_headers, grade=12, publish=True)
    _build_course(client, teacher_headers, grade=12, publish=False)  # draft: must stay hidden

    # Unpaid student: blocked entirely.
    _, unpaid = make_student(pkg="secondary", grade=12)
    assert client.get("/api/student/courses", headers=unpaid).status_code == 403

    # Paid student in the right grade: sees only the published course.
    phone, paid = make_student(pkg="academic", grade=12)
    activate_via_manual_payment(client, paid, admin_headers, txn=f"TXN-LMS-{uuid.uuid4().hex[:6]}")
    res = client.get("/api/student/courses", headers=paid)
    assert res.status_code == 200
    titles = [c["title"] for c in res.json()]
    assert course["title"] in titles
    assert all(c["is_published"] for c in res.json())

    # Lesson file: paid student can download; unpaid cannot.
    up = client.post(f"/api/teacher/lessons/{lesson['id']}/file", headers=teacher_headers,
                     files={"file": ("worksheet.png", png_bytes() + b"x", "image/png")})
    url = up.json()["file_download_url"]
    assert client.get(url, headers=paid).status_code == 200
    assert client.get(url, headers=unpaid).status_code == 403


def test_analytics_and_roster(client, teacher_headers, make_student):
    _build_course(client, teacher_headers)
    make_student(pkg="academic", grade=12)

    analytics = client.get("/api/teacher/analytics", headers=teacher_headers)
    assert analytics.status_code == 200
    body = analytics.json()
    assert body["total_courses"] >= 1
    assert "average_score" in body and "recent_attempts" in body

    roster = client.get("/api/teacher/students", headers=teacher_headers)
    assert roster.status_code == 200
    assert isinstance(roster.json(), list)
    assert all("attempts_count" in s for s in roster.json())


def test_student_cannot_manage_courses(client, make_student):
    _, headers = make_student()
    assert client.post("/api/teacher/courses", headers=headers, json={
        "title": "X", "subject": "Y", "grade_level": 12,
    }).status_code == 403
    assert client.get("/api/teacher/analytics", headers=headers).status_code == 403
