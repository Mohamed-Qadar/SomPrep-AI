"""Premium subscription gating tests (AI Coach + Technology Skills)."""
from app.database import SessionLocal
from app import models
from tests.conftest import activate_via_manual_payment


def _make_tech_track():
    """Create a tech track + lesson directly in the DB; return (track_id, lesson_id)."""
    db = SessionLocal()
    track = models.TechTrack(name="Office Skills", slug=f"office-{models.TechTrack.__name__}",
                             description="d", icon=None, color=None)
    # ensure unique slug per call
    import uuid
    track.slug = f"office-{uuid.uuid4().hex[:6]}"
    db.add(track)
    db.commit()
    db.refresh(track)
    lesson = models.TechLesson(track_id=track.id, title="L1", order_index=1,
                               content_type="video", content_url="https://video/secret.mp4",
                               duration_minutes=5)
    db.add(lesson)
    db.commit()
    tid, lid, slug = track.id, lesson.id, track.slug
    db.close()
    return tid, lid, slug


def test_non_subscriber_blocked_from_ai_coach(client, make_student):
    _, h = make_student()
    r = client.get("/api/ai_coach/brief", headers=h)
    assert r.status_code == 403


def test_subscriber_allowed_ai_coach(client, make_student, admin_headers):
    _, h = make_student()
    activate_via_manual_payment(client, h, admin_headers, txn="TXN-AICOACH-1")
    r = client.get("/api/ai_coach/brief", headers=h)
    # Gating must pass — body may 200 (or 500 if OpenAI offline) but never 403.
    assert r.status_code != 403


def test_non_subscriber_blocked_from_tech_enroll(client, make_student):
    tid, _, _ = _make_tech_track()
    _, h = make_student()
    r = client.post(f"/api/tech/enroll/{tid}", headers=h)
    assert r.status_code == 403


def test_tech_content_locked_for_non_subscriber(client, make_student):
    _, _, slug = _make_tech_track()
    _, h = make_student()
    r = client.get(f"/api/tech/tracks/{slug}", headers=h)
    assert r.status_code == 200
    # Lesson structure visible, but premium content URL is hidden.
    for lesson in r.json()["lessons"]:
        assert lesson["content_url"] is None


def test_tech_content_unlocked_for_subscriber(client, make_student, admin_headers):
    _, _, slug = _make_tech_track()
    _, h = make_student()
    activate_via_manual_payment(client, h, admin_headers, txn="TXN-TECH-1")
    r = client.get(f"/api/tech/tracks/{slug}", headers=h)
    assert r.status_code == 200
    assert any(l["content_url"] for l in r.json()["lessons"])
