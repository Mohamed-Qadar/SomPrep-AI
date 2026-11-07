import datetime

from app.database import SessionLocal
from app import models
from tests.conftest import activate_via_manual_payment, png_bytes


def _activate_student(client, make_student, admin_headers, txn):
    _, headers = make_student()
    activate_via_manual_payment(client, headers, admin_headers, txn=txn)
    return headers


def test_community_image_upload_and_fetch(client, make_student, admin_headers):
    headers = _activate_student(client, make_student, admin_headers, "TXN-COMM-IMG")

    upload = client.post(
        "/api/community/media/upload",
        files={"file": ("screen.png", png_bytes(), "image/png")},
        headers=headers,
    )
    assert upload.status_code == 200
    media_url = upload.json()["media_url"]
    assert media_url.startswith("/api/community/media/")

    fetched = client.get(media_url, headers=headers)
    assert fetched.status_code == 200
    assert fetched.headers["content-type"].startswith("image/png")


def test_direct_room_is_only_visible_to_members(client, make_student, admin_headers):
    owner = _activate_student(client, make_student, admin_headers, "TXN-COMM-DM-1")
    other = _activate_student(client, make_student, admin_headers, "TXN-COMM-DM-2")
    outsider = _activate_student(client, make_student, admin_headers, "TXN-COMM-DM-3")

    other_me = client.get("/api/auth/me", headers=other).json()
    room = client.post(
        "/api/community/rooms",
        json={"name": "Private", "type": "direct", "members": [other_me["id"]]},
        headers=owner,
    )
    assert room.status_code == 200
    room_id = room.json()["id"]

    assert client.get(f"/api/community/rooms/{room_id}/messages", headers=owner).status_code == 200
    assert client.get(f"/api/community/rooms/{room_id}/messages", headers=other).status_code == 200
    assert client.get(f"/api/community/rooms/{room_id}/messages", headers=outsider).status_code == 403


def test_dynamic_blocked_word_blocks_community_message(client, make_student, admin_headers):
    student = _activate_student(client, make_student, admin_headers, "TXN-COMM-WORD")

    word = client.post(
        "/api/admin/moderation/blocked-words",
        json={"word": "badcustomword"},
        headers=admin_headers,
    )
    assert word.status_code == 200

    rooms = client.get("/api/community/rooms", headers=student)
    room_id = rooms.json()[0]["id"]
    blocked = client.post(
        f"/api/community/rooms/{room_id}/messages",
        json={"content": "this has badcustomword", "image_url": None},
        headers=student,
    )
    assert blocked.status_code == 400


def test_mute_user_blocks_posting(client, make_student, admin_headers):
    student = _activate_student(client, make_student, admin_headers, "TXN-COMM-MUTE")
    me = client.get("/api/auth/me", headers=student).json()

    db = SessionLocal()
    user = db.query(models.User).filter(models.User.id == me["id"]).first()
    user.muted_until = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) + datetime.timedelta(hours=1)
    db.commit()
    db.close()

    rooms = client.get("/api/community/rooms", headers=student)
    room_id = rooms.json()[0]["id"]
    muted = client.post(
        f"/api/community/rooms/{room_id}/messages",
        json={"content": "hello", "image_url": None},
        headers=student,
    )
    assert muted.status_code == 403
