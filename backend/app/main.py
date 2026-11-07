import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine
from app.api import auth, exams, payments, payment, ai_coach, videos, reviewer, tech_skills, admin_users, teacher_videos, teacher_exams, teacher_courses, courses, community, moderation, payments_system, payment_webhook, package_catalog

# ─────────────────────────────────────────────────────────────────────────────
# DB MIGRATION HELPER (SQLite-safe column additions)
# Runs on startup to add any new columns introduced after the initial DB was
# created. SQLite does not support ALTER TABLE ... ADD COLUMN IF NOT EXISTS,
# so we catch the OperationalError silently when a column already exists.
# ─────────────────────────────────────────────────────────────────────────────


_MIGRATIONS = [
    # users table
    "ALTER TABLE users ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN total_xp_points INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN admin_session_version INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN password_changed_at DATETIME",
    "ALTER TABLE users ADD COLUMN muted_until DATETIME",
    "ALTER TABLE users ADD COLUMN selected_region VARCHAR(50) NOT NULL DEFAULT 'Federal'",
    "ALTER TABLE users ADD COLUMN grade_level INTEGER NOT NULL DEFAULT 12",
    "ALTER TABLE users ADD COLUMN education_level VARCHAR(50) NOT NULL DEFAULT 'Secondary'",
    "ALTER TABLE users ADD COLUMN learning_goal VARCHAR(100) NOT NULL DEFAULT 'Daily Learning'",
    "ALTER TABLE users ADD COLUMN learner_type VARCHAR(50) NOT NULL DEFAULT 'school_student'",
    # users package subscription columns
    "ALTER TABLE users ADD COLUMN package_type VARCHAR(50)",
    "ALTER TABLE users ADD COLUMN package_access_scope VARCHAR(50)",
    "ALTER TABLE users ADD COLUMN package_paid_at DATETIME",
    "ALTER TABLE users ADD COLUMN package_expires_at DATETIME",
    # categories table
    "ALTER TABLE categories ADD COLUMN grade_level INTEGER NOT NULL DEFAULT 12",
    "ALTER TABLE categories ADD COLUMN regional_board VARCHAR(50) NOT NULL DEFAULT 'Federal'",
    # subtopics table
    "ALTER TABLE subtopics ADD COLUMN icon_slug VARCHAR(50)",
    "ALTER TABLE subtopics ADD COLUMN prerequisite_subtopic_id INTEGER REFERENCES subtopics(id) ON DELETE SET NULL",
    "ALTER TABLE subtopics ADD COLUMN topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE",
    # questions table
    "ALTER TABLE questions ADD COLUMN reflex_step_title VARCHAR(300)",
    "ALTER TABLE questions ADD COLUMN mock_exam_id INTEGER REFERENCES mock_exams(id) ON DELETE SET NULL",
    "ALTER TABLE questions ADD COLUMN language VARCHAR(10) NOT NULL DEFAULT 'so'",
    "ALTER TABLE questions ADD COLUMN source_type VARCHAR(50) NOT NULL DEFAULT 'teacher_drafted'",
    "ALTER TABLE questions ADD COLUMN reviewer_status VARCHAR(20) NOT NULL DEFAULT 'approved'",
    "ALTER TABLE questions ADD COLUMN reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL",
    "ALTER TABLE questions ADD COLUMN version INTEGER NOT NULL DEFAULT 1",
    # exam_attempts table
    "ALTER TABLE exam_attempts ADD COLUMN mock_exam_id INTEGER REFERENCES mock_exams(id) ON DELETE CASCADE",
    "ALTER TABLE exam_attempts ADD COLUMN time_spent_seconds INTEGER NOT NULL DEFAULT 0",
    # student_progress table
    "ALTER TABLE student_progress ADD COLUMN stars_awarded INTEGER NOT NULL DEFAULT 0",
    # ai_coach_logs table
    "ALTER TABLE ai_coach_logs ADD COLUMN mood_type VARCHAR(50) NOT NULL DEFAULT 'motivational'",
    # teacher columns
    "ALTER TABLE users ADD COLUMN subject VARCHAR(100)",
    "ALTER TABLE users ADD COLUMN school VARCHAR(100)",
    "ALTER TABLE users ADD COLUMN bio TEXT",
    "ALTER TABLE users ADD COLUMN profile_photo_url VARCHAR(500)",
    "ALTER TABLE users ADD COLUMN teacher_package_scope VARCHAR(50) NOT NULL DEFAULT 'academic'",
    # payment submission security fields
    "ALTER TABLE payment_submissions ADD COLUMN payment_account_id INTEGER REFERENCES payment_accounts(id) ON DELETE SET NULL",
    "ALTER TABLE payment_submissions ADD COLUMN merchant_phone VARCHAR(100)",
    "ALTER TABLE payment_submissions ADD COLUMN payer_phone VARCHAR(50)",
    "ALTER TABLE payment_submissions ADD COLUMN transaction_status VARCHAR(30) NOT NULL DEFAULT 'pending'",
    # subscription_plans dynamic package catalog columns
    "ALTER TABLE subscription_plans ADD COLUMN slug VARCHAR(80)",
    "ALTER TABLE subscription_plans ADD COLUMN display_title VARCHAR(120)",
    "ALTER TABLE subscription_plans ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'academic'",
    "ALTER TABLE subscription_plans ADD COLUMN audience VARCHAR(200)",
    "ALTER TABLE subscription_plans ADD COLUMN target VARCHAR(200)",
    "ALTER TABLE subscription_plans ADD COLUMN access_scope VARCHAR(50) NOT NULL DEFAULT 'academic'",
    "ALTER TABLE subscription_plans ADD COLUMN monthly_price FLOAT",
    "ALTER TABLE subscription_plans ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD'",
    "ALTER TABLE subscription_plans ADD COLUMN button_label VARCHAR(100)",
    "ALTER TABLE subscription_plans ADD COLUMN details_path VARCHAR(200)",
    "ALTER TABLE subscription_plans ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1",
    "ALTER TABLE subscription_plans ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 100",
    # Single-device login enforcement (rotated per login)
    "ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0",
    # Teacher exam categories (quiz/test/midterm/final/homework)
    "ALTER TABLE teacher_exams ADD COLUMN exam_type VARCHAR(30) NOT NULL DEFAULT 'test'",
]


def run_migrations():
    """Safely applies schema additions to an existing SQLite database."""
    with engine.connect() as conn:
        for sql in _MIGRATIONS:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                # Column already exists or DB is fresh — either way, safe to skip
                conn.rollback()


# ─────────────────────────────────────────────────────────────────────────────
# APP BOOTSTRAP
# ─────────────────────────────────────────────────────────────────────────────

def drop_old_tech_tables():
    """
    Drops ONLY the retired first-generation technology-skills tables so the new
    schema can be created cleanly. These names are no longer used by any model.

    IMPORTANT: the current schema's `tech_lessons` and `tech_enrollments` tables
    (see models.py) must NOT be dropped here — doing so wiped live lesson content
    and student enrollments/progress on every server restart.
    """
    for table in ["tech_lesson_progress", "tech_quiz_questions", "tech_courses"]:
        try:
            with engine.connect() as conn:
                conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
                conn.commit()
        except Exception:
            pass

# 1. Clean up old technology tables if they conflict
drop_old_tech_tables()

# 2. Create any brand-new tables (won't touch existing ones)
Base.metadata.create_all(bind=engine)

# 3. Add any new columns to existing tables
run_migrations()

# 4. Ensure the receipt upload directory exists (kept OUTSIDE any static mount)
#    and is writable. Fail fast in production; warn in dev.
import os as _os

def _ensure_writable_dir(path, label: str, env_name: str):
    try:
        path.mkdir(parents=True, exist_ok=True)
        writable = _os.access(path, _os.W_OK)
    except Exception as exc:  # noqa: BLE001
        writable = False
        print(f"WARNING: could not create {label} storage dir {path}: {exc}")

    if not writable:
        msg = f"{label} storage path is not writable: {path}. Set {env_name} in .env."
        if settings.is_production:
            raise RuntimeError(msg)
        print(f"WARNING: {msg}")


_ensure_writable_dir(settings.receipt_storage_dir, "Receipt", "RECEIPT_STORAGE_PATH")
_ensure_writable_dir(settings.community_media_storage_dir, "Community media", "COMMUNITY_MEDIA_STORAGE_PATH")
_ensure_writable_dir(settings.teacher_material_storage_dir, "Teacher material", "TEACHER_MATERIAL_STORAGE_PATH")

app = FastAPI(
    title="SomPrep AI API",
    description="Backend Exam Engine & AI Analytics platform for SomPrep AI",
    version="2.0.0",
)

# CORS configuration — origins are env-driven (CORS_ALLOWED_ORIGINS in .env).
# Defaults to the local Vite dev server; set real origins in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_request_logger = logging.getLogger("somprep.requests")


@app.middleware("http")
async def security_and_observability(request: Request, call_next):
    """
    One pass for API hardening and observability:
      * browser-protection headers on every response (HSTS in production only —
        sending it over plain-HTTP dev would poison localhost);
      * request timing, with slow requests (>1s) and server errors logged.
    """
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    if response.status_code >= 500 or elapsed_ms > 1000:
        _request_logger.warning(
            "%s %s -> %s (%.0f ms)",
            request.method, request.url.path, response.status_code, elapsed_ms,
        )
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Last-resort handler: log the full traceback server-side, return a safe,
    generic body to the client (never leak stack traces or SQL).
    """
    _request_logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. The issue has been logged."},
    )

# Register API routers
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(exams.router)
app.include_router(payments.router)
app.include_router(payment.router)
app.include_router(ai_coach.router)
app.include_router(videos.router)
app.include_router(reviewer.router)
app.include_router(tech_skills.router)
app.include_router(admin_users.router)
app.include_router(teacher_videos.router)
app.include_router(teacher_exams.router)
app.include_router(teacher_courses.router)
app.include_router(community.router)
app.include_router(moderation.router)
app.include_router(payments_system.router)
app.include_router(payment_webhook.router)
app.include_router(package_catalog.router)



@app.get("/")
def read_root():
    return {
        "message": "Welcome to SomPrep AI API v2.0",
        "status": "healthy",
        "version": "2.0.0",
    }
