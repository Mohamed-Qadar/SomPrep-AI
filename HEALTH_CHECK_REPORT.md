# SomPrep AI — Project Health Check & Cleanup Report

**Date:** 24 June 2026
**Scope:** Deep verification pass focused on payments, subscription access control, authorization, route protection, and security. Fixes applied where they were safe and could not break working modules. PostgreSQL compatibility preserved.

---

## 1. Summary

The codebase is in good overall shape and well-structured (clean `api / services / utils` split on the backend; `pages / components / context / layouts / services` on the frontend). The secure payment design intent is clearly present — a payment request is logged as *pending* and only an admin/teacher can confirm it, so a subscription is never self-activated. However, this audit found **three serious, exploitable problems** plus several smaller ones. The most important were fixed in place.

**Headline findings**

| # | Severity | Problem | Status |
|---|----------|---------|--------|
| 1 | 🔴 Critical | Manual payment submission was silently broken (`db.refresh` with no `db.commit` under `autoflush=False`) — the main checkout path threw and lost the record | **Fixed** |
| 2 | 🔴 Critical | Student `/methods` endpoint leaked merchant **API keys & secrets** to the browser | **Fixed** |
| 3 | 🔴 Critical | Legacy `/api/payments/subscribe` & `/checkout-12month` granted a **free 365-day subscription** to any logged-in user (sandbox gateway always returns SUCCESS) | **Fixed** |
| 4 | 🟠 High | Insecure default `SECRET_KEY` could ship to production (JWT forgery) | **Fixed (guardrail added)** |
| 5 | 🟠 High | Checkout sends a placeholder receipt URL chosen from only 2 fixed links → duplicate-screenshot guard would falsely reject the 2nd payer | **Fixed (made unique) — real upload still needed** |
| 6 | 🟡 Medium | AI Coach and Technology-Skills lessons/quizzes are **not** subscription-gated server-side | Flagged (not changed — see risks) |

---

## 2. Files changed

All changes are minimal and localized.

1. **`backend/app/api/payments_system.py`**
   - Added the missing `db.commit()` in `submit_manual_payment` (was `add` → `refresh`, which fails because the session uses `autoflush=False`).
   - `GET /methods` now returns the new secret-free `PaymentMethodPublicOut` schema and orders recommended methods first.
   - Removed two unused variables (`all_txs`, `all_screenshots`) in `admin_list_submissions`.

2. **`backend/app/schemas.py`**
   - Added `PaymentMethodPublicOut` — a student-facing payment-method view that **omits** `merchant_id`, `api_user_id`, `api_key`, `api_secret`, and `webhook_url`.

3. **`backend/app/api/payments.py`**
   - Deprecated `POST /api/payments/subscribe` and `POST /api/payments/checkout-12month`. They now return **HTTP 410 Gone** instead of auto-activating a subscription. `GET /status` and `POST /voucher-redeem` are unchanged and still work.

4. **`backend/app/config.py`**
   - Added a startup guardrail: if `SECRET_KEY` is still the bundled default, log a warning in sandbox/dev and **refuse to start** in production (`EVC_SANDBOX_MODE=false`).

5. **`frontend/src/pages/Checkout.jsx`**
   - The manual-receipt placeholder URL is now unique per submission (`...&ref=<userId>-<txnId>-<timestamp>`) so legitimate payments aren't rejected as "duplicate screenshot". Marked with a `TODO(production)` to wire a real file-upload endpoint.

---

## 3. Problems found (detail)

### Payment system
- **Broken manual submission (critical).** `submit_manual_payment` called `db.add()` then `db.refresh()` with no commit. With `SessionLocal(autoflush=False)`, the INSERT was never flushed; `refresh()` raised and `get_db()` rolled back on close. Net effect: every manual receipt upload returned a 500 and saved nothing. The API-mode handler (`submit-api`) did it correctly (`commit` then `refresh`), which masked the issue.
- **Secret exposure (critical).** `GET /api/payments_system/methods` is open to any authenticated student and serialized with `PaymentAccountOut`, which includes `api_key` and `api_secret`. Any student could read the merchant credentials from the network tab.
- **Free self-activation (critical).** `payments.py:checkout_12month` activated a 365-day subscription whenever `evc_client.initiate_merchant_payment()` returned `SUCCESS`. The sandbox client **always** returns `SUCCESS`, and even a real gateway "SUCCESS" only means the USSD push was *sent*, not paid. These endpoints aren't used by the UI (the app uses the correct pending→confirm EVC flow), so they were pure attack surface.
- **Receipt upload is a stub.** The frontend never uploads the chosen image; it sends a hard-coded Unsplash URL. Combined with the duplicate-screenshot guard, this caused false rejections (now mitigated) but real receipts are still not stored.
- **API-mode auto-activation.** `simulate_payment_process` activates a subscription on a simulated "successful" result. This is fine for sandbox, but a payment method left in `mode="api"` in production would auto-activate without a verified gateway callback. Keep methods in **manual** mode until a real provider webhook (with signature verification) is implemented.

### Authorization / route protection (mostly healthy)
- Backend admin routes use `require_role(["admin"])` / `["admin","teacher"]` correctly; subscription activation is gated behind admin/teacher on the EVC confirm path. ✅
- Frontend `RouteGuards` (`ProtectedRoute`, `RoleRoute`, `TeacherRoute`, `GuestRoute`) correctly redirect unauthenticated and non-admin users, with loading states. ✅
- The axios interceptor handles 401 (logout) and 402/403 (paywall redirect) globally. ✅

### Subscription access control
- **Videos** are gated server-side via `check_content_access()` (grade + active package + expiry). ✅
- **Community** is gated via `require_active_subscription()`. ✅
- **AI Coach** (`/api/ai_coach/*`) and **Technology Skills** (`/api/tech/*` enroll / lesson-complete / quiz) only require `get_current_user` — **no subscription check**. A logged-in non-subscriber can call these directly. (Not changed — see Remaining risks.)

### Security / config
- Default `SECRET_KEY` shipped in code (now guarded).
- CORS is hard-coded to `localhost:3000` — fine for dev, needs env-driven origins for production.
- No rate limiting on auth/payment endpoints.

---

## 4. Problems fixed

- ✅ Manual payment submissions now persist (added `db.commit()`).
- ✅ Merchant API keys/secrets are no longer sent to students (`PaymentMethodPublicOut`).
- ✅ Free self-activation endpoints disabled (HTTP 410), without touching the working `/status` and voucher flows.
- ✅ Production startup blocked when the default `SECRET_KEY` is used; dev gets a clear warning.
- ✅ Checkout no longer trips its own duplicate-screenshot guard.

## 5. Removed duplicated / unnecessary code

- Removed unused `all_txs` / `all_screenshots` lists in `admin_list_submissions`.
- Neutralized the redundant, insecure second activation path in `payments.py` (the project already has a correct one in `payment.py`).

> **Not removed (intentionally):** `seed.py`, `seed_tech.py`, and `app/seed_tech.py` appear to be parallel seeders, and the three payment routers (`payment.py`, `payments.py`, `payments_system.py`) still each own live, used endpoints. Deleting files was avoided to honor "don't break working features." See "Files needing manual attention."

---

## 6. Remaining risks

1. **AI Coach & Tech-Skills are not subscription-gated** server-side. If these are meant to be premium, add `Depends(require_active_subscription)` to those routers. They were left unchanged because they may be intentionally free/preview and gating them could lock out current users — confirm the intended business rule first.
2. **Receipt uploads are not real.** Until a file-upload endpoint + storage exists, admins approve payments against a placeholder image, and the "same receipt reused" protection is weak. This is the biggest functional gap in the manual flow.
3. **API-mode payments auto-activate via a simulator.** Do not enable `mode="api"` on a payment account in production until a real, signature-verified provider webhook replaces `simulate_payment_process`.
4. **`SECRET_KEY`, CORS, and DB URL** must be set via `.env` in production. Confirm `.env` is git-ignored and that a strong key is set.
5. **No rate limiting** on login/register/payment submission — vulnerable to brute force and spam submissions.
6. **`payments.py` still constructs an `EVCPlusClient`** that is now unused there (harmless, but a small leftover).

## 7. Features still missing / partial

- Real receipt image upload + protected storage (admin-only access to receipts).
- Provider webhook for true API-mode payment verification (currently simulated).
- Activity/audit log for admin actions (approvals/rejections record `approved_by_id` and timestamp, but there's no general admin action log).
- Environment-driven CORS origins and rate limiting.

## 8. Commands executed

| Command | Result |
|---|---|
| `python3 -m compileall app/` (backend) | **Not run** — Linux sandbox failed to boot this session |
| `npm run build` (frontend) | **Not run** — same reason |

Static verification was done by inspection of all five edited files. Edits are syntactically self-contained and consistent with the surrounding code. **Please run the two commands locally to confirm** (the previous cleanup already reported both passing, and these changes are small and localized):

```bash
# Backend
cd somprep-ai/backend && python -m compileall app/

# Frontend
cd somprep-ai/frontend && npm run build
```

## 9. Recommended next improvements (priority order)

1. **Gate AI Coach and Tech-Skills** with `require_active_subscription` if they are premium.
2. **Implement real receipt upload** (`UploadFile`, validate type+size server-side, store outside web root, admin-only retrieval). `python-multipart` is already in `requirements.txt`.
3. **Add rate limiting** (e.g. `slowapi`) to `/api/auth/login`, `/register`, and payment submission endpoints.
4. **Move CORS origins, SECRET_KEY, DB URL fully to `.env`**; verify `.env` is git-ignored.
5. **Consolidate payment routers** into one module with clear sub-sections once flows are confirmed, and converge the two phone-validation implementations into one shared helper.
6. **Add a lightweight admin action/audit log** table for approvals, rejections, and account changes.

## 10. Files needing manual attention

- `frontend/src/pages/Checkout.jsx` — replace the placeholder receipt URL with a real upload once the backend endpoint exists (marked with `TODO(production)`).
- `backend/app/api/ai_coach.py`, `backend/app/api/tech_skills.py` — decide and apply the subscription rule.
- `backend/seed.py`, `backend/seed_tech.py`, `backend/app/seed_tech.py` — confirm which seeders are canonical and remove the rest.
- `backend/app/main.py` — production hardening: env-driven CORS, and consider an app `lifespan` instead of import-time migration calls.
