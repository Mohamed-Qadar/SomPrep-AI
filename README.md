# SomPrep AI

**SomPrep AI** is a Somalia-focused digital learning platform. It helps Somali students prepare for national exams, build everyday digital skills, and learn job-ready technology. It supports learning in Somali and English and takes payment through local mobile money.

## What it offers

| Track | Who it is for | What students get |
|---|---|---|
| **Academic Exam Prep** | Grade 1 – Grade 12 students | Subject lessons, quizzes, **Grade 8 Regional** and **Grade 12 National** exam simulators, mock exams, and wrong-answer review |
| **Office Skills** | Students and workers | Word, Excel, PowerPoint, typing, and assignment skills |
| **Professional Tech Skills** | Learners aiming for tech jobs | Programming, data analysis, machine learning basics, and practical projects |

### Key features

- **AI Coach and diagnostics:** personalised study guidance, diagnostic reports, and a learning roadmap (OpenAI-powered).
- **Exam engine:** timed mock exams, results, and wrong-answer review.
- **Video lessons and courses (LMS):** teachers upload videos and build courses, and students follow them.
- **Community:** a student discussion space with admin moderation tools.
- **Packages and payments:** affordable subscription packages, mobile money checkout (EVC Plus / WaafiPay), receipt upload with admin review, and a webhook pipeline for automatic activation that stays off by default.
- **Role-based access:** separate dashboards for **students**, **teachers**, **reviewers**, and **admins**.
- **Security:** JWT auth, single-device sessions (one paid account can't be shared by a whole classroom), rate limiting, security headers, audit logs, and a system-health page.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, React Router 6, Tailwind CSS, Axios, lucide-react |
| Backend | FastAPI, SQLAlchemy 2, Pydantic 2, Uvicorn |
| Database | PostgreSQL (production) / SQLite (local development) |
| Auth | JWT (PyJWT) + bcrypt password hashing |
| AI | OpenAI API |
| Payments | EVC Plus / WaafiPay (Hormuud) |
| Tests | pytest |

## Project structure

```
somprep-ai/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers (auth, exams, courses, payments, ai_coach, community, ...)
│   │   ├── services/     # AI engine, exam logic, payment webhook, receipt storage, ...
│   │   ├── utils/        # auth, access control, audit log, rate limiting
│   │   ├── models.py     # SQLAlchemy models
│   │   ├── schemas.py    # Pydantic schemas
│   │   ├── config.py     # settings loaded from .env
│   │   └── main.py       # FastAPI app entry point
│   ├── tests/            # pytest suite
│   ├── seed.py           # demo data
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/        # public, student, teacher, and admin pages
    │   ├── components/
    │   ├── layouts/
    │   ├── context/      # AuthContext
    │   └── services/api.js
    └── package.json
```

## Getting started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (optional for local development, since SQLite also works)

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env    # then edit .env with your own values
python seed.py          # optional: load demo data
uvicorn app.main:app --reload --port 8001
```

The API runs at `http://localhost:8001`, and the interactive docs are at `http://localhost:8001/docs`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

### Environment variables

`backend/.env.example` lists every setting. The most important ones:

| Variable | Purpose |
|---|---|
| `ENVIRONMENT` | `development` or `production` |
| `SECRET_KEY` | JWT signing key. Use a long random string. The app refuses to start in production with the default. |
| `DATABASE_URL` | e.g. `postgresql://user:pass@host:5432/somprep_db` or `sqlite:///./somprep.db` |
| `CORS_ALLOWED_ORIGINS` / `FRONTEND_URL` | Allowed frontend origins |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | AI Coach and diagnostics |
| `EVC_*` | Mobile money settings. Keep `EVC_SANDBOX_MODE=true` until going live. |
| `RECEIPT_STORAGE_PATH` | Where payment receipts are stored. Keep it outside any public folder. |

> Never commit your real `.env` file. It is already listed in `.gitignore`.

## Running tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

The tests use an isolated temporary SQLite database, so they never touch real data.

## Documentation

- [AUTOMATIC_PAYMENTS_GO_LIVE.md](AUTOMATIC_PAYMENTS_GO_LIVE.md): checklist for enabling automatic mobile money payments
- [PRODUCTION_READINESS_REPORT_R3.md](PRODUCTION_READINESS_REPORT_R3.md): latest production-readiness review
- [HEALTH_CHECK_REPORT.md](HEALTH_CHECK_REPORT.md): system health check
- [CODEBASE_AUDIT_AND_CLEANUP_REPORT.md](CODEBASE_AUDIT_AND_CLEANUP_REPORT.md): codebase audit notes

## Author

**Mohamed Ibrahim Abdi** ([@Mohamed-Qadar](https://github.com/Mohamed-Qadar))
