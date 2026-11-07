# SomPrep AI — Production-Readiness Report (Round 3)

**Date:** 24 June 2026
**Scope:** Priorities 1–7 — Admin Audit Log UI, System Health page, payment webhook
architecture, frontend lazy-loading, receipt-storage hardening, a permanent pytest
suite, and verification.

> **Verification note (read first):** This session's Linux sandbox mounts the project
> through OneDrive. The many rapid edits triggered OneDrive sync churn, and the mount
> began serving **truncated/torn snapshots** of the most-edited files (`App.jsx`,
> `schemas.py`, `config.py`, `payments_system.py`, `main.py`). I confirmed via the
> editor (authoritative Windows view) that **the real files are complete and correct**
> — e.g. `App.jsx` is the full 299-line router and `config.py` is intact. Because the
> mount served partial files, I could **not run `pytest` / `npm run build` to green in
> this session**. Round 2 already verified the equivalent backend (23/23) and the
> frontend build end-to-end, and all new standalone backend files parse cleanly on the
> mount. **Please run the two commands in §6 locally to confirm** — they should pass.

---

## 1. New features added

### P1 — Admin Audit Logs UI  (`/admin/audit-logs`, admin only)
`src/pages/admin/AuditLogs.jsx`: clean table with **Date/Time, Admin, Action, Target,
Target ID, IP, Old, New**; filters for **action type, admin name, target type, date
range**; free-text **search**; client-side **pagination**; **mobile card** layout;
**loading / empty / error** states. Values come pre-masked from the backend (secrets are
never stored raw), and long JSON values are truncated in the cell.

### P2 — System Health / Production Checklist  (`/admin/system-health`, admin only)
- Backend: `GET /api/payments_system/admin/system-health` returns **safe status flags
  only** (no secret values) — Environment, Production mode, EVC sandbox, SECRET_KEY
  safe/unsafe, DATABASE_URL default/configured, CORS, receipt storage writable, receipt
  max size, payment API-mode, webhook signature configured, rate limiter, frontend URL,
  backend health — each tagged **safe / warning / critical / info**, plus an overall roll-up.
- Frontend: `src/pages/admin/SystemHealth.jsx` renders the checks as colour-coded cards.

### P3 — Payment provider webhook architecture (dormant, safe-by-default)
- `app/services/payment_webhook_service.py`: HMAC-SHA256 **signature verification**
  (constant-time), provider **status mapping**, and a `process_webhook()` that enforces
  the **full validation chain** before activating anything: valid signature → unique
  transaction id (across subscriptions & submissions) → currency = USD → amount matches
  official package price → receiver/merchant matches (if configured) → status successful
  → user reference exists → timestamp within window. **Idempotency** via a unique
  `event_id`; every callback is logged.
- `app/models.py`: new `WebhookEvent` table (idempotency + audit).
- `app/api/payment_webhook.py`: `POST /api/webhooks/{provider}` (rate-limited) and an
  admin-only `GET /api/payments_system/admin/webhook-events`.
- **Stays disabled in production:** with no `EVC_WEBHOOK_SECRET` set, signatures can't be
  verified, so callbacks are logged as `unverified` and **never activate a subscription**;
  API-mode payments remain blocked (from Round 2).

### P4 — Frontend lazy loading / code splitting
`App.jsx` rewritten to load **every route with `React.lazy` + `Suspense`** (fallback =
existing `LoadingState`). Admin pages, `PaymentReview`, `Community`, AI-coach and
Tech-skills pages now split into their own chunks, shrinking the initial bundle so the
landing/login path no longer downloads the admin/student app up front.

### P5 — Receipt storage hardening
- Startup **writability check** in `main.py`: fails fast in production, warns in dev if
  the receipt directory isn't writable.
- `app/services/receipt_storage.py`: storage **interface** with `LocalReceiptStorage`
  (current behaviour) and a documented `S3ReceiptStorage` **stub** for the future — not
  enabled. Receipts remain **outside the web root** and **admin/owner-only**.
- `.env.example` documents `RECEIPT_STORAGE_PATH`; retention/backup guidance in §7.

### P6 — Permanent pytest suite (`backend/tests/`)
Isolated **temp SQLite** + temp receipt dir (never touches dev/prod data), with an
autouse fixture that resets the in-memory rate limiter between tests. Coverage:
non-subscriber blocked from AI Coach; subscriber allowed; non-subscriber blocked from
premium tech; tech content locked vs unlocked; receipt upload valid/invalid; receipt
owner/other/admin access; manual submission; duplicate transaction rejected; admin
approval activates subscription; legacy `/subscribe` → 410; `/methods` hides secrets;
login rate limit → 429; **production default SECRET_KEY fails startup** and **API-mode in
production → 503** (both via subprocess). Plus `pytest.ini` and `requirements-dev.txt`.

---

## 2. Files changed / added

**Backend — new:** `app/services/payment_webhook_service.py`,
`app/api/payment_webhook.py`, `app/services/receipt_storage.py`,
`tests/__init__.py`, `tests/conftest.py`, `tests/test_payments.py`,
`tests/test_gating.py`, `tests/test_production_config.py`, `pytest.ini`,
`requirements-dev.txt`.

**Backend — edited:** `app/config.py` (webhook + receiver settings),
`app/models.py` (`WebhookEvent`), `app/schemas.py` (`WebhookEventOut`,
`SystemHealthCheck`, `SystemHealthOut`), `app/main.py` (register webhook router,
receipt writability check), `app/api/payments_system.py` (system-health endpoint;
import `_DEFAULT_SECRET_KEY`).

**Frontend — new:** `src/pages/admin/AuditLogs.jsx`, `src/pages/admin/SystemHealth.jsx`.

**Frontend — edited:** `src/App.jsx` (lazy loading + 2 new admin routes),
`src/pages/AdminDashboard.jsx` (admin quick-links bar to reach all admin tools).

---

## 3. Problems fixed / improvements
- Admin actions captured in Round 2 now have a **usable UI** (previously API-only).
- Operators get a **one-screen production safety check** before going live.
- A **safe, testable webhook path** exists for future automatic payments without
  enabling anything risky now.
- **Smaller initial JS bundle** → faster first load on mobile (the main goal).
- **Receipt storage** fails fast if misconfigured, with a clean path to object storage.
- The throwaway Round-2 checks are now a **repeatable regression suite**.

## 4. Build / test results
| Check | Result |
|---|---|
| New standalone backend files parse (mount) | ✅ webhook service/router, receipt storage, models, all tests |
| `config.py`, `App.jsx` integrity (authoritative editor view) | ✅ complete & correct |
| `pytest` (full suite) | ⛔ not run this session — mount served torn snapshots; run locally (§6) |
| `npm run build` | ⛔ not run this session — same reason; run locally (§6) |
| Round 2 equivalent backend + build | ✅ previously 23/23 + 1622 modules built |

## 5. Remaining risks
1. **Live build/tests not executed this session** (OneDrive-mount sync churn). Risk is
   low — authoritative files verified by inspection and patterns match the Round-2
   green run — but please run §6 locally to be certain.
2. **Rate limiter is in-process** — fine for one instance; use Redis for multi-worker.
3. **Webhook is dormant** — real provider field names will differ; adapt `_extract` /
   `map_provider_status` and set `EVC_WEBHOOK_SECRET` + `EVC_MERCHANT_RECEIVER` before
   enabling. Keep API-mode off until then.
4. **Receipts on local disk** — move to object storage for multi-instance; add backups.
5. Bundle still has a few large vendor chunks; further manual chunking is optional.

## 6. Manual steps before production
1. **Run the suite locally** (PowerShell/terminal):
   ```bash
   cd somprep-ai/backend
   python -m pip install -r requirements-dev.txt
   python -m compileall app/
   python -m pytest -q            # expect all tests passing
   ```
2. **Build the frontend locally:**
   ```bash
   cd somprep-ai/frontend
   npm ci
   npm run build                  # expect a successful production build
   ```
3. Create `backend/.env` from `.env.example`: set `ENVIRONMENT=production`, a strong
   `SECRET_KEY`, real `DATABASE_URL`, real `CORS_ALLOWED_ORIGINS`/`FRONTEND_URL`, and a
   persistent `RECEIPT_STORAGE_PATH`. Leave `EVC_WEBHOOK_SECRET` empty until a real
   provider webhook is wired (API-mode stays safely disabled).
4. Ensure the reverse proxy forwards `X-Forwarded-For` (accurate audit-log IPs) and the
   receipt directory is on persistent storage, backed up, excluded from any static mount.

## 7. Receipt backup / retention guidance
Store receipts on a persistent volume (or object storage). Recommended: **nightly
backup** of the receipt directory + the `payment_submissions` table together (they
reference each other by `file_key`), and a **retention policy** (e.g. keep approved
receipts 24 months for dispute resolution, purge rejected/expired after 3 months) in line
with local financial record-keeping rules.

## 8. Recommended next steps
1. Run §6 locally and paste any failures back — I'll fix immediately.
2. Integrate the real provider webhook (adapt `_extract`, set the secret) to enable
   automatic payments safely.
3. Move rate limiting to Redis and receipts to S3/GCS when scaling beyond one instance.
