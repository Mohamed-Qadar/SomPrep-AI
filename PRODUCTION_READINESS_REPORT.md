# SomPrep AI — Production-Readiness Report (Round 2)

**Date:** 24 June 2026
**Scope:** Priorities 1–8 from the production-readiness plan — subscription gating, real
receipt uploads, API-simulation guards, rate limiting, config hardening, admin audit
logging, payment-router cleanup, and full verification.

**Verification status:** ✅ Backend compiles, all edited modules import, **23/23 functional
tests pass**, production guards verified, **frontend builds (1622 modules, 10s)**.

---

## 1. What was done (by priority)

### P1 — Subscription gating on premium features ✅
Premium APIs now reject non-subscribers server-side (admins/teachers bypass automatically):

- **AI Coach** (`/api/ai_coach/brief`, `/analyze`) → require active subscription.
- **Technology Skills**: `enroll`, `lesson/{id}/complete`, `quiz/{id}` → require active subscription.
- **Lesson content lock**: `GET /api/tech/tracks/{slug}` still lists lessons (for preview), but
  `content_url` is **nulled for non-subscribers** so premium material is never delivered to the browser.
- A reusable, non-raising `has_active_subscription(user)` helper was added; `require_active_subscription`
  now uses it and returns HTTP 403 (the frontend interceptor turns 403 into a paywall redirect).

**Intentionally free (documented):** browsing the track list (`/api/tech/tracks`) and viewing a
track's structure/titles. Existing video lessons remain gated by `check_content_access` (unchanged).

### P2 — Real receipt upload + protected access ✅
- New `POST /api/payments_system/upload-receipt` (`UploadFile`): validates type (**jpg/jpeg/png/webp/pdf**)
  by **both** declared content-type **and magic bytes**, enforces size (`MAX_RECEIPT_SIZE_MB`, default 5 MB),
  and stores the file **outside any static/web root** under `<backend>/uploads/receipts/` (configurable).
- Files are named by **SHA-256 of their content**, so identical receipts dedupe to one file and reused
  receipts are caught by the existing duplicate guard.
- New `GET /api/payments_system/receipt/{submission_id}` streams the file **only to the submission owner
  or an admin/teacher**; direct/public access is impossible because files live outside the web root.
- `Checkout.jsx` now uploads the real file (multipart) and submits the returned `file_key` (placeholder
  Unsplash URL removed). PDF/webp supported with a PDF preview chip.
- `PaymentReview.jsx` loads each receipt as an **authenticated blob** (new `ReceiptThumbnail` component)
  and shows images inline / PDFs in an iframe modal.

### P3 — Unsafe API simulation disabled in production ✅
- `submit-api` returns **HTTP 503** when `is_production` (no real provider webhook exists yet), directing
  users to manual upload.
- `simulate_payment_process` **bails out immediately** in production, so a simulated payment can never
  activate a subscription outside sandbox/dev.

### P4 — Rate limiting ✅
Added a dependency-free, per-IP sliding-window limiter (`app/utils/rate_limit.py`) — no new packages, so it
can't break imports. Applied to: **login** (10/min), **register** (5/min), **submit-manual** (8/min),
**submit-api** (8/min), **upload-receipt** (12/min), **status polling** (90/min), **voucher-redeem** (8/min).
Exceeding the limit returns **HTTP 429** with a clear Somali/English message and `Retry-After`.

### P5 — Production config hardening ✅
- New env-driven settings: `ENVIRONMENT`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`, `RECEIPT_STORAGE_PATH`,
  `MAX_RECEIPT_SIZE_MB` (plus existing `SECRET_KEY`, `DATABASE_URL`, EVC/OpenAI keys).
- CORS origins are now **read from env** (no longer hard-coded to localhost).
- **Production refuses to start** (raises) when `SECRET_KEY` or `DATABASE_URL` are still the bundled
  defaults; warns if CORS is localhost-only in production. "Production" = `ENVIRONMENT=production` **or**
  `EVC_SANDBOX_MODE=false`.
- New **`.gitignore`** (ignores `.env`, `backend/uploads/`, `node_modules/`, `dist/`, DB files) and
  **`backend/.env.example`** template documenting every variable.

### P6 — Admin audit logging ✅
- New `AdminActionLog` table (admin_id, admin_name, action_type, target_type, target_id, old_value,
  new_value, ip_address, UTC timestamp) + best-effort `log_admin_action()` helper (never breaks the
  primary request; captures `X-Forwarded-For`/client IP; **masks secret fields**).
- Logged actions: payment **approved / rejected / marked-duplicate / under-review**, payment **account
  created / updated / enabled / disabled**, **teacher enabled/disabled**.
- New admin-only `GET /api/payments_system/admin/audit-logs` (filter by `action_type`, newest first).

### P7 — Payment router cleanup + docs ✅
Canonical architecture documented in module docstrings (no working endpoints deleted):

- **`payments_system.py` = canonical** — accounts, receipt upload/retrieval, manual submissions + admin
  verification → subscription activation, sandbox-only API simulation, audit log.
- **`payment.py`** — EVC Plus pending→confirm (admin/teacher confirm).
- **`payments.py`** — retained only for `GET /status` and `POST /voucher-redeem`; the insecure
  auto-activation endpoints stay disabled (**HTTP 410**, from round 1).

### P8 — Verification ✅ (see §3)

---

## 2. Files changed

**Backend (13):**
`app/config.py`, `app/main.py`, `app/models.py`, `app/schemas.py`, `app/utils/access.py`,
`app/utils/audit.py` *(new)*, `app/utils/rate_limit.py` *(new)*, `app/api/auth.py`,
`app/api/payments.py`, `app/api/payments_system.py`, `app/api/ai_coach.py`,
`app/api/tech_skills.py`, `app/api/admin_users.py`.

**Frontend (2):**
`src/pages/Checkout.jsx`, `src/pages/admin/PaymentReview.jsx`.

**Project (2, new):**
`.gitignore`, `backend/.env.example`.

---

## 3. Commands executed & results

| Command | Result |
|---|---|
| `python3 -m compileall app/` | ✅ `COMPILE_OK` |
| Import all edited modules (no DB) | ✅ all import; 14 payment routes registered incl. `upload-receipt`, `receipt/{id}`, `admin/audit-logs` |
| Functional suite (FastAPI `TestClient` + SQLite) | ✅ **23/23 passed** |
| Production-safety: default `SECRET_KEY` | ✅ app **refuses to start** (RuntimeError) |
| Production-safety: `submit-api` in production | ✅ **HTTP 503** (no activation) |
| `vite build` | ✅ **1622 modules transformed, built in 10.3s** |

**Functional checks that passed (highlights):** non-subscriber AI Coach → 403; subscriber → not 403;
receipt upload → 200 with `sha256.ext` key; bad file type → 400; manual submit → 200; duplicate
transaction → 400; receipt access: owner/admin → 200, other student → **403**; `/methods` does **not**
leak `api_key`/`api_secret`; admin approve → subscription active; audit log contains the approval +
account-creation entries; legacy `/subscribe` → 410; login rate limit → 429.

> Notes: the SQLite test DB had to run from local `/tmp` because the mounted filesystem blocks SQLite
> I/O; the frontend `dist/` had to be written to `/tmp` because the mount blocks deleting old build
> artifacts. Both are sandbox-mount quirks, **not** code issues — the build transformed all 1622 modules.

---

## 4. Remaining risks

1. **Rate limiter is per-process (in-memory).** Correct for a single instance; for multi-worker/multi-host
   production, back it with Redis or switch to `slowapi` so limits are shared.
2. **No real payment-provider webhook yet.** API-mode is intentionally disabled in production. Manual
   receipt + admin approval is the only production path until a signed Hormuud/WaafiPay webhook is added.
3. **Existing `node_modules` is Windows-built.** On a Linux server run a fresh `npm ci` (the sandbox needed
   the Linux rollup binary). Not a code issue.
4. **Large JS bundle (~826 kB / 194 kB gzip).** Pre-existing; consider route-level `import()` code-splitting.
5. **Audit log has no UI yet** — data is captured and exposed via API; an admin screen would help.
6. **Receipt storage is local disk.** Fine for one server; use object storage (S3/GCS) for multi-instance,
   and add a backup/retention policy.

## 5. Manual steps required before production

1. **Create `backend/.env`** from `backend/.env.example` and set:
   `ENVIRONMENT=production`, a strong `SECRET_KEY`
   (`python -c "import secrets; print(secrets.token_urlsafe(48))"`), a real `DATABASE_URL`,
   `CORS_ALLOWED_ORIGINS`/`FRONTEND_URL` (your real domain), and `RECEIPT_STORAGE_PATH`
   (a persistent path outside the web root). Keep `EVC_SANDBOX_MODE=true` until a real webhook exists.
2. **Confirm `.env` is git-ignored** (it now is) and ensure `backend/uploads/` is on persistent storage and
   excluded from any static mount.
3. **Run DB migrations / first boot** against PostgreSQL (the new `admin_action_logs` table is created
   automatically by `create_all`; all new columns/types are PostgreSQL-compatible).
4. **Reinstall frontend deps on the server** (`npm ci`) and `npm run build`.
5. **Keep payment methods in `manual` mode** in the admin dashboard until the provider webhook is built
   (API mode is blocked in production by design).
6. (Recommended) Put the app behind HTTPS and a reverse proxy that sets `X-Forwarded-For` so audit-log IPs
   are accurate.

## 6. Recommended next improvements

1. Build the real **provider webhook** (signature verification) to enable safe API-mode payments.
2. Move rate limiting + (optionally) receipts to **Redis / object storage** for horizontal scaling.
3. Add an **admin Audit Log screen** consuming `/admin/audit-logs`.
4. **Code-split** the frontend bundle to cut initial load on mobile.
5. Add automated tests (the throwaway suite used here can be promoted to a permanent `pytest` file).
