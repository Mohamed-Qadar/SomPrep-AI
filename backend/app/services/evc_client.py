"""
EVC Plus (Hormuud Telecom) production payment client.

Targets the WaafiPay merchant gateway — Hormuud's official API for EVC Plus
merchant payments:

    POST {EVC_BASE_URL}            (default: https://api.waafipay.net/asm)
    serviceName: API_PURCHASE      (USSD push -> customer approves with PIN)

Credentials are read from backend/.env via app.config.settings:
    EVC_BASE_URL, EVC_MERCHANT_UID, EVC_API_USER_ID, EVC_API_KEY,
    EVC_SANDBOX_MODE, EVC_TIMEOUT_SECONDS

Behavior:
    * EVC_SANDBOX_MODE=true  -> simulated gateway (no network call), for dev.
    * EVC_SANDBOX_MODE=false -> real HTTPS call. If credentials are missing the
      client fails fast with a clear FAILED result (never a fake success).
    * All requests/outcomes are logged (phone numbers masked). DB-level
      transaction logging lives in the PaymentRequest model (app/api/payment.py).

Return contract (unchanged for existing routers):
    {"status": "SUCCESS"|"FAILED", "transaction_id": str|None,
     "message": str, "amount": float, "phone_number": str}
"""

import asyncio
import logging
import re
import time
import uuid
from datetime import datetime, timezone

import httpx

from app.config import settings

logger = logging.getLogger("somprep.evc_plus")

# WaafiPay response codes
_RC_SUCCESS = "2001"

_NON_DIGITS = re.compile(r"\D")


def _mask_phone(msisdn: str) -> str:
    """252615551234 -> 2526*****234 (safe for logs)."""
    if not msisdn or len(msisdn) < 7:
        return "***"
    return f"{msisdn[:4]}*****{msisdn[-3:]}"


def _to_msisdn(raw_phone: str) -> str:
    """
    Normalize any accepted Somali format to international MSISDN without '+':
    061..., 61..., +25261..., 25261...  ->  25261XXXXXXX
    """
    digits = _NON_DIGITS.sub("", raw_phone or "")
    if digits.startswith("252"):
        return digits
    if digits.startswith("0"):
        digits = digits[1:]
    return f"252{digits}"


class EVCPlusClient:
    """Async client for Hormuud EVC Plus merchant payments via WaafiPay."""

    def __init__(self):
        self.base_url: str = settings.EVC_BASE_URL
        self.merchant_uid: str = settings.EVC_MERCHANT_UID
        self.api_user_id: str = settings.EVC_API_USER_ID
        # Fall back to legacy env var name so existing .env files keep working.
        self.api_key: str = settings.EVC_API_KEY or settings.EVC_PLUS_API_KEY
        self.sandbox_mode: bool = settings.EVC_SANDBOX_MODE
        self.timeout_seconds: float = settings.EVC_TIMEOUT_SECONDS

    # ── Public API ──────────────────────────────────────────────────────────

    async def initiate_merchant_payment(self, student_phone: str, amount: float) -> dict:
        """
        Push a USSD payment prompt to the customer's EVC Plus wallet and wait
        for the gateway outcome. Blocking on the gateway side until the
        customer approves/rejects or the request times out.
        """
        msisdn = _to_msisdn(student_phone)
        request_id = f"SOMPREP-{uuid.uuid4().hex[:18].upper()}"

        if self.sandbox_mode:
            return await self._sandbox_payment(msisdn, amount, request_id)

        missing = self._missing_credentials()
        if missing:
            logger.error(
                "EVC Plus request %s aborted: missing credentials in .env: %s",
                request_id, ", ".join(missing),
            )
            return self._failed(
                msisdn, amount,
                "Payment service is not configured. Please contact SomPrep support.",
            )

        payload = self._build_purchase_payload(msisdn, amount, request_id)
        logger.info(
            "EVC Plus PURCHASE %s -> %s amount=%.2f USD phone=%s",
            request_id, self.base_url, amount, _mask_phone(msisdn),
        )

        started = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(self.timeout_seconds)) as client:
                response = await client.post(
                    self.base_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
            response.raise_for_status()
            body = response.json()
        except httpx.TimeoutException:
            logger.warning(
                "EVC Plus %s timed out after %.1fs (customer may not have responded to the USSD prompt)",
                request_id, time.monotonic() - started,
            )
            return self._failed(
                msisdn, amount,
                "The payment request timed out. Please make sure your phone is on and try again.",
            )
        except httpx.HTTPStatusError as exc:
            logger.error(
                "EVC Plus %s gateway HTTP %s: %s",
                request_id, exc.response.status_code, exc.response.text[:500],
            )
            return self._failed(
                msisdn, amount,
                "The EVC Plus gateway returned an error. Please try again shortly.",
            )
        except httpx.HTTPError as exc:
            logger.error("EVC Plus %s connectivity error: %s", request_id, exc)
            return self._failed(
                msisdn, amount,
                "Could not reach the EVC Plus service. Check your connection and try again.",
            )
        except ValueError:
            logger.error("EVC Plus %s returned a non-JSON response", request_id)
            return self._failed(
                msisdn, amount,
                "The EVC Plus gateway returned an unexpected response. Please try again.",
            )

        return self._parse_gateway_response(body, msisdn, amount, request_id, started)

    # ── Internals ───────────────────────────────────────────────────────────

    def _missing_credentials(self) -> list:
        missing = []
        if not self.base_url:
            missing.append("EVC_BASE_URL")
        if not self.merchant_uid:
            missing.append("EVC_MERCHANT_UID")
        if not self.api_user_id:
            missing.append("EVC_API_USER_ID")
        if not self.api_key:
            missing.append("EVC_API_KEY")
        return missing

    def _build_purchase_payload(self, msisdn: str, amount: float, request_id: str) -> dict:
        return {
            "schemaVersion": "1.0",
            "requestId": request_id,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "channelName": "WEB",
            "serviceName": "API_PURCHASE",
            "serviceParams": {
                "merchantUid": self.merchant_uid,
                "apiUserId": self.api_user_id,
                "apiKey": self.api_key,
                "paymentMethod": "MWALLET_ACCOUNT",
                "payerInfo": {"accountNo": msisdn},
                "transactionInfo": {
                    "referenceId": request_id,
                    "invoiceId": f"INV-{request_id}",
                    "amount": f"{amount:.2f}",
                    "currency": "USD",
                    "description": "SomPrep AI subscription",
                },
            },
        }

    def _parse_gateway_response(
        self, body: dict, msisdn: str, amount: float, request_id: str, started: float
    ) -> dict:
        response_code = str(body.get("responseCode", ""))
        response_msg = body.get("responseMsg", "No message returned by gateway.")
        params = body.get("params") or {}
        elapsed = time.monotonic() - started

        if response_code == _RC_SUCCESS:
            transaction_id = str(
                params.get("transactionId")
                or params.get("referenceId")
                or request_id
            )
            logger.info(
                "EVC Plus %s SUCCESS txn=%s state=%s in %.1fs",
                request_id, transaction_id, params.get("state", "?"), elapsed,
            )
            return {
                "status": "SUCCESS",
                "transaction_id": transaction_id,
                "message": "Payment approved via EVC Plus.",
                "amount": amount,
                "phone_number": msisdn,
            }

        logger.warning(
            "EVC Plus %s REJECTED code=%s msg=%s in %.1fs",
            request_id, response_code, response_msg, elapsed,
        )
        return self._failed(msisdn, amount, f"Payment rejected: {response_msg}")

    async def _sandbox_payment(self, msisdn: str, amount: float, request_id: str) -> dict:
        """Simulated gateway for development. Enabled by EVC_SANDBOX_MODE=true."""
        logger.info(
            "EVC Plus SANDBOX %s amount=%.2f USD phone=%s (no real charge)",
            request_id, amount, _mask_phone(msisdn),
        )
        await asyncio.sleep(0.3)  # simulate USSD prompt latency
        return {
            "status": "SUCCESS",
            "transaction_id": f"TXN-SANDBOX-{int(time.time() * 1000)}",
            "message": f"[SANDBOX] Payment of {amount:.2f} USD processed via EVC Plus.",
            "amount": amount,
            "phone_number": msisdn,
        }

    @staticmethod
    def _failed(msisdn: str, amount: float, message: str) -> dict:
        return {
            "status": "FAILED",
            "transaction_id": None,
            "message": message,
            "amount": amount,
            "phone_number": msisdn,
        }
