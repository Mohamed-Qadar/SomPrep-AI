# Automatic EVC Plus / WaafiPay Payments — Go-Live Guide

The instant flow you want is fully wired:

```
Student selects package
  → Backend creates a pending payment request
  → USSD push pops on the student's phone (WaafiPay merchant API)
  → Student enters PIN and confirms
  → Backend verifies the gateway response (or the provider webhook):
      phone · amount vs official price · package · unique transaction ID
  → Subscription activates automatically
  → Checkout page detects it (instant, no admin) and unlocks access
```

It stays **dormant until real merchant credentials exist** — that is the only
missing piece, and only Hormuud can give it to you.

## Step 1 — Get merchant credentials from Hormuud / WaafiPay
Apply for a **WaafiPay merchant account** (business registration + merchant
agreement). You receive:
- `merchantUid`
- `apiUserId`
- `apiKey`

## Step 2 — Configure `backend/.env`
```env
ENVIRONMENT=production
SECRET_KEY=<generate a long random string>
EVC_MERCHANT_UID=<merchantUid from Hormuud>
EVC_API_USER_ID=<apiUserId from Hormuud>
EVC_API_KEY=<apiKey from Hormuud>
EVC_SANDBOX_MODE=false
# Optional but recommended if WaafiPay signs callbacks:
EVC_WEBHOOK_SECRET=<shared secret agreed with the provider>
EVC_MERCHANT_RECEIVER=<your merchant receiving account>
```
The backend **refuses to start in production** with unsafe defaults, and
**refuses live API payments** (HTTP 503) until sandbox mode is off and real
credentials are set — so a misconfiguration cannot give away free access.

## Step 3 — Flip the payment account to live API mode
Admin panel → **Payment Accounts** → edit the EVC Plus account:
- `mode` = `api`
- `api_status` = `live`

Keep (or add) a second account in `manual` mode as a fallback — students then
see both options: instant pay and the `*712*` manual flow.

## Step 4 — (Optional) point the provider webhook at the backend
Give Hormuud/WaafiPay your callback URL:
```
POST https://<your-domain>/api/webhooks/waafipay
```
Signature header: `X-Signature: sha256=<HMAC-SHA256 of the raw body>`.
Every callback is idempotent, fully validated (signature, amount vs official
price, currency, unique transaction ID, user reference, timestamp window), and
observable in Admin → `webhook-events`. A verified callback activates the
subscription AND auto-approves the student's pending submission, so the
checkout page unlocks by itself.

If WaafiPay's real payload field names differ, adapt ONE function:
`backend/app/services/payment_webhook_service.py::_extract` (and
`map_provider_status` if their status strings differ).

## How verification works (why it's safe without an admin)
1. The price is always taken from the **admin package catalog**, never from the
   client. A tampered amount is rejected.
2. A transaction ID can only ever activate **one** subscription (checked across
   subscriptions, submissions, and webhook events).
3. In live API mode, activation happens only on the gateway's synchronous
   confirmation — which WaafiPay returns **after** the student enters their PIN.
4. Webhook activation additionally requires a valid HMAC signature and a fresh
   timestamp (±1 hour).
5. Every path is audit-logged; manual admin review remains available for the
   manual-mode fallback.

## Test coverage
`backend/tests/test_webhook_auto_activation.py` proves: unsigned callback never
activates; signed valid callback activates + auto-approves the pending
submission + is replay-safe; wrong amount is rejected.
