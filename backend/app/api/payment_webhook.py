"""
Payment provider webhook endpoints (FUTURE-READY, dormant by default).

POST /api/webhooks/{provider}
    Receives a provider callback. Verifies the signature and runs the full
    validation chain in app.services.payment_webhook_service. Until
    EVC_WEBHOOK_SECRET is configured, every callback is logged as 'unverified'
    and NO subscription is activated. Always returns quickly so providers don't
    hammer retries; the processing outcome is in the JSON body.

GET /api/payments_system/admin/webhook-events  (admin only)
    Observability for received callbacks.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.api.auth import require_role
from app.database import get_db
from app.services import payment_webhook_service as wh
from app.utils.rate_limit import rate_limit

router = APIRouter(tags=["Payment Webhooks"])

_SIGNATURE_HEADERS = ("x-signature", "x-waafi-signature", "x-evc-signature", "signature")


@router.post(
    "/api/webhooks/{provider}",
    dependencies=[Depends(rate_limit("payment_webhook", max_calls=60, window_seconds=60))],
)
async def receive_payment_webhook(
    provider: str,
    request: Request,
    db: Session = Depends(get_db),
):
    raw_body = await request.body()
    signature = None
    for h in _SIGNATURE_HEADERS:
        if h in request.headers:
            signature = request.headers[h]
            break

    result = wh.process_webhook(db, provider=provider, raw_body=raw_body, signature=signature)

    # Signal a hard error only on a real signature failure (secret configured).
    if result.get("status") == "invalid_signature":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature.")

    return {
        "received": True,
        "status": result.get("status"),
        "activated": result.get("activated", False),
    }


@router.get(
    "/api/payments_system/admin/webhook-events",
    response_model=List[schemas.WebhookEventOut],
)
def list_webhook_events(
    limit: int = 200,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role(["admin"])),
):
    """List recent provider webhook callbacks (admin only)."""
    return (
        db.query(models.WebhookEvent)
        .order_by(models.WebhookEvent.created_at.desc())
        .limit(min(max(limit, 1), 1000))
        .all()
    )
