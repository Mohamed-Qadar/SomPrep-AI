"""
CANONICAL payment module for SomPrep AI.

Owns the full money/subscription lifecycle:
  * Payment accounts (admin-managed receiving numbers; EVC Plus / ZAAD / Sahal /
    eDahab / bank), with public (secret-free) listing for students.
  * Receipt upload + access-controlled retrieval.
  * Manual payment submissions and admin verification (approve / reject /
    duplicate / under_review) which activate the user's subscription.
  * Simulated API-mode payments — SANDBOX/DEV ONLY (disabled in production until a
    real, signature-verified provider webhook exists).
  * Admin audit log of sensitive actions.

Companion modules:
  * app/api/payment.py   — EVC Plus pending->confirm flow (admin/teacher confirm).
  * app/api/payments.py  — subscription STATUS + voucher redeem only. Its old
                           auto-activation endpoints are deprecated (HTTP 410).
"""
import csv
import datetime
import hashlib
import io
import re
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File, Request
from fastapi.responses import StreamingResponse, FileResponse, RedirectResponse
from sqlalchemy import or_, and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.api.auth import get_current_user, require_role
from app.config import settings, _DEFAULT_SECRET_KEY
from app.database import get_db, SessionLocal
from app.services.evc_client import EVCPlusClient
from app.utils.audit import log_admin_action
from app.utils.rate_limit import rate_limit
from app.api.package_catalog import ensure_default_packages, get_active_package, get_package_name

router = APIRouter(prefix="/api/payments_system", tags=["Subscription Payments"])
evc_client = EVCPlusClient()

# Package prices and names are loaded from the admin-managed package catalog.

# ── Receipt upload configuration ─────────────────────────────────────────────
# Allowed receipt types mapped to canonical extension.
_ALLOWED_RECEIPT_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}
_EXT_MEDIA_TYPE = {
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
}
# Stored receipt keys are always "<sha256>.<ext>" — validate before touching disk.
_RECEIPT_KEY_RE = re.compile(r"^[A-Fa-f0-9]{64}\.(jpg|png|webp|pdf)$")


def _normalize_payment_number(value: str) -> str:
    """Normalize phone/account strings for equality checks without changing storage."""
    return re.sub(r"\D", "", value or "")


def _expected_package_price(db: Session, package_id: str, duration_months: int) -> Optional[float]:
    ensure_default_packages(db)
    plan = get_active_package(db, package_id)
    if not plan or plan.duration_months != duration_months:
        return None
    return float(plan.price)


def _validate_package_and_amount(db: Session, package_id: str, duration_months: int, amount: float):
    expected = _expected_package_price(db, package_id, duration_months)
    if expected is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Xirmada la doortay lama aqbali karo ama waa dansan tahay. "
                "(Invalid or inactive package slug.)"
            ),
        )
    try:
        amount_value = float(amount)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Xaddiga lacagta ma saxna. (Payment amount is invalid.)",
        )
    if amount_value <= 0 or round(amount_value, 2) != round(expected, 2):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Xaddiga lacagtu lama mid aha qiimaha rasmiga ah. (Amount does not match the official package price.)",
        )


def _reject_same_payer_and_merchant(payer_phone: str, merchant_phone: str):
    payer = _normalize_payment_number(payer_phone)
    merchant = _normalize_payment_number(merchant_phone)
    if payer and merchant and payer == merchant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Lambarka ardayga lacagta ka bixinaya ma noqon karo lambarka akoonka "
                "lacagta qaata. (Payer phone cannot be the merchant receiving number.)"
            ),
        )


def _find_payment_account(
    db: Session,
    *,
    method_type: str,
    receiving_number: str,
    account_id: Optional[int] = None,
    api_only: bool = False,
) -> Optional[models.PaymentAccount]:
    query = db.query(models.PaymentAccount).filter(models.PaymentAccount.is_active == True)
    if account_id is not None:
        query = query.filter(models.PaymentAccount.id == account_id)
    else:
        query = query.filter(models.PaymentAccount.method_type == method_type)
    if api_only:
        query = query.filter(models.PaymentAccount.mode == "api")

    accounts = query.order_by(models.PaymentAccount.is_recommended.desc(), models.PaymentAccount.id.asc()).all()
    requested_receiving = _normalize_payment_number(receiving_number)
    for account in accounts:
        if not requested_receiving or _normalize_payment_number(account.receiving_number) == requested_receiving:
            return account
    return None


def _require_live_provider_config(method: models.PaymentAccount):
    if method.api_status != "live":
        return
    if settings.EVC_SANDBOX_MODE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Live payment account requires EVC_SANDBOX_MODE=false.",
        )
    missing = []
    if not settings.EVC_MERCHANT_UID:
        missing.append("EVC_MERCHANT_UID")
    if not settings.EVC_API_USER_ID:
        missing.append("EVC_API_USER_ID")
    if not (settings.EVC_API_KEY or settings.EVC_PLUS_API_KEY):
        missing.append("EVC_API_KEY")
    if missing:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Live EVC Plus credentials are missing: {', '.join(missing)}.",
        )
    fake_markers = ("test", "fake", "sandbox", "demo", "changeme")
    configured_values = [
        settings.EVC_MERCHANT_UID,
        settings.EVC_API_USER_ID,
        settings.EVC_API_KEY or settings.EVC_PLUS_API_KEY,
    ]
    if any(any(marker in value.lower() for marker in fake_markers) for value in configured_values if value):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Live EVC Plus credentials look like test/fake values.",
        )


def _activate_subscription_from_submission(
    db: Session,
    submission: models.PaymentSubmission,
    *,
    approved_by_id: Optional[int] = None,
):
    """Activate access only after a payment has been verified or manually approved."""
    now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    submission.status = "approved"
    submission.transaction_status = "approved"
    submission.approved_at = now_utc
    if approved_by_id is not None:
        submission.approved_by_id = approved_by_id

    user = db.query(models.User).filter(models.User.id == submission.user_id).first()
    if user:
        user.package_type = submission.package_id
        plan = get_active_package(db, submission.package_id)
        if plan:
            user.package_access_scope = plan.access_scope
        user.package_paid_at = now_utc

        dur_months = submission.package_duration_months or 12
        user.package_expires_at = now_utc + datetime.timedelta(days=dur_months * 30)

        sub = db.query(models.UserSubscription).filter(models.UserSubscription.user_id == user.id).first()
        if not sub:
            sub = models.UserSubscription(user_id=user.id)
            db.add(sub)

        sub.status = "active"
        sub.expires_at = user.package_expires_at
        sub.price_paid = submission.package_price
        sub.transaction_id = submission.transaction_id
        sub.activated_at = now_utc


def _sniff_extension(content_type: str, blob: bytes) -> Optional[str]:
    """
    Determine a safe extension from BOTH the declared content-type and the file's
    magic bytes. Returns None if the file is not an allowed receipt type.
    """
    declared = _ALLOWED_RECEIPT_EXT.get((content_type or "").lower())
    # Magic-byte signature checks (defends against a spoofed content-type header).
    if blob[:3] == b"\xff\xd8\xff":
        magic = ".jpg"
    elif blob[:8] == b"\x89PNG\r\n\x1a\n":
        magic = ".png"
    elif blob[:4] == b"RIFF" and blob[8:12] == b"WEBP":
        magic = ".webp"
    elif blob[:4] == b"%PDF":
        magic = ".pdf"
    else:
        magic = None
    if magic is None:
        return None
    # If a content-type was declared it must agree with the real bytes.
    if declared is not None and declared != magic:
        return None
    return magic


# ─────────────────────────────────────────────────────────────────────────────
# STUDENT ENDPOINTS (Any authenticated user can access)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/methods", response_model=List[schemas.PaymentMethodPublicOut])
def get_active_payment_methods(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Retrieve only the active payment methods that the admin has configured.
    Returns the public (secret-free) view — API keys/secrets are never exposed
    to students. Recommended methods are surfaced first for the checkout UI.
    """
    return db.query(models.PaymentAccount).filter(
        models.PaymentAccount.is_active == True
    ).order_by(
        models.PaymentAccount.is_recommended.desc(),
        models.PaymentAccount.id.asc(),
    ).all()


@router.post(
    "/upload-receipt",
    response_model=schemas.ReceiptUploadOut,
    dependencies=[Depends(rate_limit("receipt_upload", max_calls=12, window_seconds=60))],
)
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
):
    """
    Upload a payment receipt (jpg/jpeg/png/webp/pdf, max MAX_RECEIPT_SIZE_MB).
    The file is stored OUTSIDE the public web root under a content-hash key.
    Returns an opaque `file_key` to send back with /submit-manual. Files are only
    retrievable via the access-controlled /receipt/{submission_id} endpoint.
    """
    max_bytes = int(settings.MAX_RECEIPT_SIZE_MB * 1024 * 1024)
    # Read one byte past the cap so we can detect oversize without loading huge files.
    blob = await file.read(max_bytes + 1)
    if not blob:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faylka waa madhan yahay. (The uploaded file is empty.)",
        )
    if len(blob) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"Faylku waa inuu ka yaraadaa {settings.MAX_RECEIPT_SIZE_MB:.0f}MB. "
                f"(File must be under {settings.MAX_RECEIPT_SIZE_MB:.0f}MB.)"
            ),
        )

    ext = _sniff_extension(file.content_type, blob)
    if ext is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Nooca faylka lama ogola. Kaliya JPG, PNG, WEBP ama PDF ayaa la aqbalayaa. "
                "(Unsupported file type. Only JPG, PNG, WEBP or PDF are allowed.)"
            ),
        )

    digest = hashlib.sha256(blob).hexdigest()
    file_key = f"{digest}{ext}"

    storage_dir = settings.receipt_storage_dir
    storage_dir.mkdir(parents=True, exist_ok=True)
    dest = storage_dir / file_key
    if not dest.exists():  # identical receipts dedupe to one file
        dest.write_bytes(blob)

    return schemas.ReceiptUploadOut(
        file_key=file_key,
        content_type=_EXT_MEDIA_TYPE.get(ext, "application/octet-stream"),
    )


@router.get("/receipt/{submission_id}")
def get_receipt_file(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Stream a payment receipt. Authorized for the submission owner and
    admins/teachers only. Public/direct file access is not possible because the
    files live outside any static mount.
    """
    submission = db.query(models.PaymentSubmission).filter(
        models.PaymentSubmission.id == submission_id
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Receipt not found.")

    if submission.user_id != current_user.id and current_user.role not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Not authorized to view this receipt.")

    key = submission.screenshot_url or ""
    # Legacy submissions stored an external URL — redirect those through.
    if key.startswith("http://") or key.startswith("https://"):
        return RedirectResponse(key)

    if not _RECEIPT_KEY_RE.match(key):
        raise HTTPException(status_code=404, detail="Receipt file unavailable.")

    path = settings.receipt_storage_dir / key
    if not path.exists():
        raise HTTPException(status_code=404, detail="Receipt file unavailable.")

    ext = key[key.rfind("."):].lower()
    return FileResponse(path, media_type=_EXT_MEDIA_TYPE.get(ext, "application/octet-stream"))


@router.post(
    "/submit-manual",
    response_model=schemas.PaymentSubmissionOut,
    dependencies=[Depends(rate_limit("submit_manual", max_calls=8, window_seconds=60))],
)
def submit_manual_payment(
    payment_in: schemas.PaymentSubmissionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Submit a manual mobile money (EVC, ZAAD, Sahal, eDahab) or bank transfer payment receipt.
    Validates duplicates on transaction_id and screenshot_url.
    """
    # Validation
    if not payment_in.sender_phone.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fadlan geli lambarka aad lacagta ka dirtay. (Sender phone number is required.)"
        )
    if not payment_in.screenshot_url.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fadlan soo gali sawirka caddaynta lacag bixinta. (Payment screenshot is required.)"
        )
    if not payment_in.transaction_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fadlan geli aqoonsiga kala iibsiga (Transaction ID)."
        )
    _validate_package_and_amount(
        db,
        payment_in.package_id,
        payment_in.package_duration_months,
        payment_in.amount_paid,
    )
    _reject_same_payer_and_merchant(
        payment_in.sender_phone,
        payment_in.admin_receiving_account,
    )

    payment_account = _find_payment_account(
        db,
        method_type=payment_in.payment_method,
        receiving_number=payment_in.admin_receiving_account,
    )
    if not payment_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ma jiro akoon lacag qaata oo firfircoon. (No active merchant payment account exists.)",
        )

    # Prevent duplicate transaction ID (approved or pending)
    dup_tx = db.query(models.PaymentSubmission).filter(
        models.PaymentSubmission.transaction_id == payment_in.transaction_id.strip(),
        models.PaymentSubmission.status.in_(["pending", "under_review", "approved", "duplicate"])
    ).first()
    if dup_tx:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aqoonsiga kala iibsiga (Transaction ID) mar hore ayaa la isticmaalay. (This transaction ID has already been submitted.)"
        )

    # Prevent duplicate screenshot
    dup_screenshot = db.query(models.PaymentSubmission).filter(
        models.PaymentSubmission.screenshot_url == payment_in.screenshot_url.strip(),
        models.PaymentSubmission.status.in_(["pending", "under_review", "approved"])
    ).first()
    if dup_screenshot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sawirka caddaynta lacag bixinta mar hore ayaa la isticmaalay. (This screenshot has already been used.)"
        )

    # Create submission record
    submission = models.PaymentSubmission(
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_email=current_user.phone_number,  # user phone_number is main login email/phone
        package_id=payment_in.package_id,
        package_name=get_package_name(db, payment_in.package_id),
        package_price=_expected_package_price(db, payment_in.package_id, payment_in.package_duration_months),
        package_duration_months=payment_in.package_duration_months,
        payment_method=payment_in.payment_method,
        admin_receiving_account=payment_account.receiving_number,
        sender_phone=payment_in.sender_phone.strip(),
        payment_account_id=payment_account.id,
        merchant_phone=payment_account.receiving_number,
        payer_phone=payment_in.sender_phone.strip(),
        amount_paid=_expected_package_price(db, payment_in.package_id, payment_in.package_duration_months),
        currency=payment_account.currency,
        transaction_id=payment_in.transaction_id.strip(),
        screenshot_url=payment_in.screenshot_url.strip(),
        status="pending",
        transaction_status="pending",
    )
    db.add(submission)
    try:
        db.commit()
    except IntegrityError:
        # Race-safe duplicate guard: two concurrent submits can both pass the
        # pre-check above, but the DB unique constraint on transaction_id lets
        # only one win. Convert the loser's constraint error into a clean 400
        # instead of a 500.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aqoonsiga kala iibsiga (Transaction ID) mar hore ayaa la isticmaalay. (This transaction ID has already been submitted.)",
        )
    db.refresh(submission)
    return submission


@router.post(
    "/submit-api",
    response_model=schemas.PaymentSubmissionOut,
    dependencies=[Depends(rate_limit("submit_api", max_calls=8, window_seconds=60))],
)
async def submit_api_payment(
    payment_in: schemas.PaymentSubmitApiRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Initiate an automatic mobile money payment request.

    Request creation never grants access. The transaction is saved as pending
    first; only a verified live provider success or admin approval activates the
    user's package.
    """
    _validate_package_and_amount(
        db,
        payment_in.package_id,
        payment_in.package_duration_months,
        payment_in.package_price,
    )

    clean_phone = "".join(filter(str.isdigit, payment_in.sender_phone))
    local_phone = clean_phone
    if clean_phone.startswith("252"):
        local_phone = clean_phone[3:]
    elif clean_phone.startswith("00252"):
        local_phone = clean_phone[5:]
    elif clean_phone.startswith("0") and len(clean_phone) == 10:
        local_phone = clean_phone[1:]

    if len(local_phone) != 9:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fadlan geli lambar telefoon oo sax ah (9 lambar). (Please enter a valid 9-digit phone number.)"
        )
    _reject_same_payer_and_merchant(
        payment_in.sender_phone,
        payment_in.admin_receiving_account,
    )

    method = _find_payment_account(
        db,
        method_type=payment_in.payment_method,
        receiving_number=payment_in.admin_receiving_account,
        account_id=payment_in.payment_account_id,
        api_only=True,
    )
    if not method:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habka lacag bixinta ee la doortay lama helin ama ma firfircoona. (Selected payment method not found or inactive.)"
        )

    if method.mode != "api":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Habkan uma oggola lacag bixin toos ah. Fadlan isticmaal habka gacanta. (This method does not support automatic payment.)"
        )

    if method.api_status == "disabled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Habka lacag bixinta tooska ah hadda waa dansan yahay. (Automatic payment is currently disabled.)"
        )
    _require_live_provider_config(method)

    official_price = _expected_package_price(db, payment_in.package_id, payment_in.package_duration_months)
    tx_suffix = uuid.uuid4().hex[:8].upper()
    transaction_id = f"TXN-API-{tx_suffix}"

    submission = models.PaymentSubmission(
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_email=current_user.phone_number,
        package_id=payment_in.package_id,
        package_name=get_package_name(db, payment_in.package_id),
        package_price=official_price,
        package_duration_months=payment_in.package_duration_months,
        payment_method=payment_in.payment_method,
        admin_receiving_account=method.receiving_number,
        sender_phone=payment_in.sender_phone.strip(),
        payment_account_id=method.id,
        merchant_phone=method.receiving_number,
        payer_phone=payment_in.sender_phone.strip(),
        amount_paid=official_price,
        currency=method.currency,
        transaction_id=transaction_id,
        screenshot_url="",
        status="pending",
        transaction_status="pending",
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)

    if method.api_status == "live":
        gateway = await EVCPlusClient().initiate_merchant_payment(
            student_phone=payment_in.sender_phone,
            amount=official_price,
        )
        if gateway.get("status") == "SUCCESS":
            provider_txn = gateway.get("transaction_id")
            if provider_txn:
                existing = db.query(models.PaymentSubmission).filter(
                    models.PaymentSubmission.transaction_id == provider_txn,
                    models.PaymentSubmission.id != submission.id,
                ).first()
                if existing:
                    submission.status = "failed"
                    submission.transaction_status = "failed"
                    submission.admin_note = "Provider returned a duplicate transaction ID."
                    db.commit()
                    db.refresh(submission)
                    return submission
                submission.transaction_id = provider_txn
            _activate_subscription_from_submission(db, submission)
            log_admin_action(
                db,
                admin=None,
                action_type="payment_auto_activated_gateway",
                target_type="user",
                target_id=current_user.id,
                new_value={
                    "package_id": submission.package_id,
                    "amount": submission.amount_paid,
                    "transaction_id": submission.transaction_id,
                    "submission_id": submission.id,
                },
            )
        else:
            submission.status = "failed"
            submission.transaction_status = "failed"
            submission.admin_note = gateway.get("message") or "Live provider payment failed or was not confirmed."
        db.commit()
        db.refresh(submission)

    return submission


@router.get(
    "/status/{submission_id}",
    response_model=schemas.PaymentSubmissionOut,
    dependencies=[Depends(rate_limit("payment_status", max_calls=90, window_seconds=60))],
)
def get_submission_status(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get the status of a specific payment submission.
    """
    submission = db.query(models.PaymentSubmission).filter(
        models.PaymentSubmission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caddaynta lacag bixinta lama helin. (Payment submission not found.)"
        )
        
    # Enforce access control: only the owner or admins/teachers can check status
    if submission.user_id != current_user.id and current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ma oggolid inaad aragto macluumaadkan. (Not authorized.)"
        )
        
    return submission


@router.get("/my-history", response_model=List[schemas.PaymentSubmissionOut])
def get_my_payment_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get payment submission history of the logged in user.
    """
    return db.query(models.PaymentSubmission).filter(
        models.PaymentSubmission.user_id == current_user.id
    ).order_by(models.PaymentSubmission.created_at.desc()).all()


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN ENDPOINTS: ACCOUNT MANAGEMENT (Admin only)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/admin/accounts", response_model=List[schemas.PaymentAccountOut])
def admin_get_payment_accounts(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role(["admin"]))
):
    """
    Get all payment accounts (active & inactive) for administration dashboard.
    """
    return db.query(models.PaymentAccount).order_by(models.PaymentAccount.id.asc()).all()


@router.post("/admin/accounts", response_model=schemas.PaymentAccountOut)
def admin_create_payment_account(
    account_in: schemas.PaymentAccountCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role(["admin"]))
):
    """
    Add a new payment receiving account/number.
    """
    account = models.PaymentAccount(
        method_type=account_in.method_type,
        account_name=account_in.account_name,
        receiving_number=account_in.receiving_number,
        currency=account_in.currency,
        instructions=account_in.instructions,
        is_recommended=account_in.is_recommended,
        min_amount=account_in.min_amount,
        max_amount=account_in.max_amount,
        user_notes=account_in.user_notes,
        is_active=True,
        mode=account_in.mode,
        api_provider=account_in.api_provider,
        merchant_id=account_in.merchant_id,
        api_user_id=account_in.api_user_id,
        api_key=account_in.api_key,
        api_secret=account_in.api_secret,
        webhook_url=account_in.webhook_url,
        api_status=account_in.api_status
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    # Audit (never log secret credentials).
    log_admin_action(
        db,
        admin=admin,
        action_type="payment_account_created",
        request=request,
        target_type="payment_account",
        target_id=account.id,
        new_value={
            "method_type": account.method_type,
            "account_name": account.account_name,
            "receiving_number": account.receiving_number,
            "mode": account.mode,
            "is_recommended": account.is_recommended,
        },
    )
    db.commit()
    return account


@router.put("/admin/accounts/{account_id}", response_model=schemas.PaymentAccountOut)
def admin_update_payment_account(
    account_id: int,
    account_in: schemas.PaymentAccountUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role(["admin"]))
):
    """
    Edit a payment receiving account settings.
    """
    account = db.query(models.PaymentAccount).filter(models.PaymentAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Payment account not found.")

    _secret_fields = {"api_key", "api_secret", "merchant_id", "api_user_id", "webhook_url"}
    changed = {}
    for field, val in account_in.model_dump(exclude_unset=True).items():
        # Record which fields changed (mask secrets) for the audit trail.
        if field in _secret_fields:
            changed[field] = "***updated***"
        else:
            changed[field] = val
        setattr(account, field, val)

    db.commit()
    db.refresh(account)

    log_admin_action(
        db,
        admin=admin,
        action_type="payment_account_updated",
        request=request,
        target_type="payment_account",
        target_id=account.id,
        new_value=changed,
    )
    db.commit()
    return account


@router.patch("/admin/accounts/{account_id}/toggle", response_model=schemas.PaymentAccountOut)
def admin_toggle_payment_account(
    account_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role(["admin"]))
):
    """
    Toggle a payment method's active status.
    """
    account = db.query(models.PaymentAccount).filter(models.PaymentAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Payment account not found.")

    was_active = account.is_active
    account.is_active = not account.is_active
    db.commit()
    db.refresh(account)

    log_admin_action(
        db,
        admin=admin,
        action_type="payment_account_enabled" if account.is_active else "payment_account_disabled",
        request=request,
        target_type="payment_account",
        target_id=account.id,
        old_value={"is_active": was_active},
        new_value={"is_active": account.is_active},
    )
    db.commit()
    return account


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN ENDPOINTS: PAYMENT SUBMISSIONS REVIEW (Admins & Teachers)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/admin/submissions", response_model=List[schemas.PaymentSubmissionOut])
def admin_list_submissions(
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    moderator: models.User = Depends(require_role(["admin", "teacher"]))
):
    """
    List student payment submissions with optional filtering by status and search queries.
    Identifies suspicious reuse of transaction IDs or screenshots.
    """
    query = db.query(models.PaymentSubmission)
    
    if status:
        query = query.filter(models.PaymentSubmission.status == status)
        
    if search:
        search_like = f"%{search}%"
        query = query.filter(
            or_(
                models.PaymentSubmission.user_name.like(search_like),
                models.PaymentSubmission.user_email.like(search_like),
                models.PaymentSubmission.sender_phone.like(search_like),
                models.PaymentSubmission.payer_phone.like(search_like),
                models.PaymentSubmission.merchant_phone.like(search_like),
                models.PaymentSubmission.transaction_id.like(search_like),
                models.PaymentSubmission.transaction_status.like(search_like),
                models.PaymentSubmission.package_name.like(search_like)
            )
        )
        
    submissions = query.order_by(models.PaymentSubmission.created_at.desc()).all()

    # Calculate suspicious duplicates to flag for the admin UI
    result = []
    for s in submissions:
        is_suspicious = False
        
        # Check database count for identical transaction IDs
        tx_count = db.query(models.PaymentSubmission).filter(
            models.PaymentSubmission.transaction_id == s.transaction_id
        ).count()
        
        # Check database count for identical screenshot URLs
        ss_count = db.query(models.PaymentSubmission).filter(
            models.PaymentSubmission.screenshot_url == s.screenshot_url
        ).count()
        
        if tx_count > 1 or ss_count > 1:
            is_suspicious = True
            
        result.append(
            schemas.PaymentSubmissionOut(
                id=s.id,
                user_id=s.user_id,
                user_name=s.user_name,
                user_email=s.user_email,
                package_id=s.package_id,
                package_name=s.package_name,
                package_price=s.package_price,
                package_duration_months=s.package_duration_months,
                payment_method=s.payment_method,
                admin_receiving_account=s.admin_receiving_account,
                sender_phone=s.sender_phone,
                payment_account_id=s.payment_account_id,
                merchant_phone=s.merchant_phone or s.admin_receiving_account,
                payer_phone=s.payer_phone or s.sender_phone,
                amount_paid=s.amount_paid,
                currency=s.currency,
                transaction_id=s.transaction_id,
                screenshot_url=s.screenshot_url,
                status=s.status,
                transaction_status=s.transaction_status,
                admin_note=s.admin_note,
                rejection_reason=s.rejection_reason,
                created_at=s.created_at,
                approved_at=s.approved_at,
                approved_by_id=s.approved_by_id,
                is_suspicious=is_suspicious
            )
        )
    return result


@router.post("/admin/submissions/{submission_id}/resolve")
def admin_resolve_submission(
    submission_id: int,
    resolve_in: schemas.PaymentSubmissionResolve,
    request: Request,
    db: Session = Depends(get_db),
    moderator: models.User = Depends(require_role(["admin", "teacher"]))
):
    """
    Approve, reject, or mark under review a student's payment.
    Approving a payment automatically updates User profile package settings AND activates their UserSubscription record.
    """
    submission = db.query(models.PaymentSubmission).filter(models.PaymentSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Payment submission not found.")

    previous_status = submission.status
    action = resolve_in.action
    submission.admin_note = resolve_in.admin_note

    # Audit trail for this sensitive moderation action.
    _action_map = {
        "approve": "payment_approved",
        "reject": "payment_rejected",
        "duplicate": "payment_marked_duplicate",
        "under_review": "payment_under_review",
    }
    log_admin_action(
        db,
        admin=moderator,
        action_type=_action_map.get(action, f"payment_{action}"),
        request=request,
        target_type="payment_submission",
        target_id=submission.id,
        old_value={"status": previous_status},
        new_value={
            "status": action,
            "user_id": submission.user_id,
            "amount": submission.amount_paid,
            "transaction_id": submission.transaction_id,
            "rejection_reason": resolve_in.rejection_reason,
        },
    )

    if action == "approve":
        _activate_subscription_from_submission(db, submission, approved_by_id=moderator.id)
    elif action == "reject":
        submission.status = "rejected"
        submission.transaction_status = "failed"
        submission.rejection_reason = resolve_in.rejection_reason
    elif action == "duplicate":
        submission.status = "duplicate"
        submission.transaction_status = "failed"
    elif action == "under_review":
        submission.status = "under_review"
        submission.transaction_status = "pending"
        
    db.commit()
    return {"message": f"Payment successfully resolved with status: {action}"}


@router.get("/admin/submissions/export")
def admin_export_submissions_csv(
    db: Session = Depends(get_db),
    moderator: models.User = Depends(require_role(["admin", "teacher"]))
):
    """
    Export all payment records as a downloadable CSV.
    """
    submissions = db.query(models.PaymentSubmission).order_by(models.PaymentSubmission.created_at.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "ID", "Student Name", "Student Email/Phone", "Package Name", 
        "Price ($)", "Payment Method", "Payment Account ID", "Merchant Receiving Phone",
        "Payer Phone", "Amount Paid", "Transaction ID", "Status", "Transaction Status",
        "Created Date", "Approved Date"
    ])
    
    for s in submissions:
        writer.writerow([
            s.id, s.user_name, s.user_email, s.package_name,
            s.package_price, s.payment_method, s.payment_account_id,
            s.merchant_phone or s.admin_receiving_account, s.payer_phone or s.sender_phone,
            s.amount_paid, s.transaction_id, s.status, s.transaction_status,
            s.created_at.strftime("%Y-%m-%d %H:%M:%S") if s.created_at else "",
            s.approved_at.strftime("%Y-%m-%d %H:%M:%S") if s.approved_at else ""
        ])
        
    output.seek(0)
    
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=payment_submissions.csv"
    return response


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN ENDPOINTS: AUDIT LOG (Admin only)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/admin/audit-logs", response_model=List[schemas.AdminActionLogOut])
def admin_get_audit_logs(
    limit: int = 200,
    action_type: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role(["admin"])),
):
    """
    View the admin action audit trail (payment approvals/rejections, account
    changes, role changes). Newest first. Admin only.
    """
    query = db.query(models.AdminActionLog)
    if action_type:
        query = query.filter(models.AdminActionLog.action_type == action_type)
    return (
        query.order_by(models.AdminActionLog.created_at.desc())
        .limit(min(max(limit, 1), 1000))
        .all()
    )


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN ENDPOINT: SYSTEM HEALTH / PRODUCTION CHECKLIST (Admin only)
# Returns SAFE status flags only — never raw secrets or sensitive values.
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/admin/system-health", response_model=schemas.SystemHealthOut)
def admin_system_health(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role(["admin"])),
):
    import os

    checks: List[schemas.SystemHealthCheck] = []

    def add(key, label, value, st, detail=None):
        checks.append(schemas.SystemHealthCheck(
            key=key, label=label, value=str(value), status=st, detail=detail
        ))

    is_prod = settings.is_production

    add("environment", "Environment Mode", settings.ENVIRONMENT, "info")
    add("production", "Production Mode", "Yes" if is_prod else "No", "info")

    sandbox_bad = settings.EVC_SANDBOX_MODE and is_prod
    add("evc_sandbox", "EVC Sandbox Mode", "On" if settings.EVC_SANDBOX_MODE else "Off",
        "warning" if sandbox_bad else "safe",
        "Sandbox should be OFF in real production once a live provider is wired." if sandbox_bad else None)

    sk_safe = settings.SECRET_KEY != _DEFAULT_SECRET_KEY
    add("secret_key", "SECRET_KEY", "Custom (safe)" if sk_safe else "DEFAULT (unsafe)",
        "safe" if sk_safe else ("critical" if is_prod else "warning"))

    db_safe = settings.DATABASE_URL != "postgresql://postgres:postgres@localhost:5432/somprep_db"
    add("database_url", "Database URL", "Configured" if db_safe else "DEFAULT credentials",
        "safe" if db_safe else ("critical" if is_prod else "warning"))

    origins = settings.cors_origins
    only_localhost = all(("localhost" in o or "127.0.0.1" in o) for o in origins) if origins else True
    add("cors", "CORS Configuration", f"{len(origins)} origin(s)",
        "warning" if (is_prod and only_localhost) else "safe",
        "Only localhost configured while in production." if (is_prod and only_localhost) else None)

    rdir = settings.receipt_storage_dir
    writable = os.path.isdir(rdir) and os.access(rdir, os.W_OK)
    add("receipt_storage", "Receipt Storage Path", "Configured & writable" if writable else "NOT writable",
        "safe" if writable else "critical", str(rdir))
    add("receipt_max", "Receipt Max Upload Size", f"{settings.MAX_RECEIPT_SIZE_MB:.0f} MB", "info")

    api_accounts = db.query(models.PaymentAccount).filter(
        models.PaymentAccount.mode == "api", models.PaymentAccount.is_active == True
    ).count()
    add("payment_api_mode", "Payment API Mode",
        f"{api_accounts} active API account(s)" if api_accounts else "Disabled (manual only)",
        "info" if api_accounts else "safe",
        "Live API accounts require EVC_SANDBOX_MODE=false and real provider credentials; test accounts stay pending." if api_accounts else None)

    wh_configured = bool(settings.EVC_WEBHOOK_SECRET)
    add("webhook", "Provider Webhook Signature", "Configured" if wh_configured else "Not configured",
        "safe" if wh_configured else "info",
        "Required before enabling automatic API payments.")

    add("rate_limiter", "Rate Limiter", "Enabled (in-memory)", "safe",
        "Back with Redis for multi-instance deployments.")
    add("frontend_url", "Frontend URL", settings.FRONTEND_URL, "info")
    add("backend", "Backend Health", "OK", "safe")

    severities = [c.status for c in checks]
    overall = "critical" if "critical" in severities else ("warning" if "warning" in severities else "safe")

    return schemas.SystemHealthOut(
        overall=overall,
        generated_at=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None),
        checks=checks,
    )
