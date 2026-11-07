
import json
import re
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.api.auth import require_role
from app.database import get_db
from app.utils.audit import log_admin_action

router = APIRouter(prefix="/api/packages", tags=["Package Catalog"])

DEFAULT_PACKAGES = [
    {
        "slug": "academic",
        "name": "Academic Exam Prep Bundle",
        "display_title": "Academic Exam Prep",
        "category": "academic",
        "audience": "Grade 1-12 students",
        "target": "Primary, Middle, and Secondary Exam Prep",
        "grade_range": "1-12",
        "access_scope": "academic",
        "price": 7.50,
        "monthly_price": None,
        "currency": "USD",
        "duration_months": 12,
        "features": [
            "Grade 1-12 academic learning access",
            "Grade 8 and Grade 12 exam preparation",
            "Core science, mathematics, Somali, and humanities support",
            "Mock exams, wrong-answer review, and progress tracking",
            "AI coach study guidance",
        ],
        "button_label": "Get Academic Plan",
        "sort_order": 10,
    },
    {
        "slug": "primary",
        "name": "Primary School Prep Bundle",
        "category": "academic",
        "audience": "Grade 1-4 students",
        "target": "Arithmetic & Literacy",
        "grade_range": "1-4",
        "access_scope": "primary",
        "price": 2.50,
        "currency": "USD",
        "duration_months": 12,
        "features": [
            "Foundational mathematics and counting maps",
            "Elementary science and vocabulary lessons",
            "Af-Soomaali learning support",
            "Practice worksheets and mini-quizzes",
            "Visual feedback and progress stars",
        ],
        "button_label": "Get Primary Plan",
        "sort_order": 20,
    },
    {
        "slug": "middle",
        "name": "Middle School Prep Bundle",
        "category": "academic",
        "audience": "Grade 5-8 students",
        "target": "Grade 8 Regional Exams",
        "grade_range": "5-8",
        "access_scope": "middle",
        "price": 2.50,
        "currency": "USD",
        "duration_months": 12,
        "features": [
            "Syllabus coverage across core subjects",
            "Grade 8 regional exam simulations",
            "Detailed explanations by local educators",
            "Wrong-answer notebook",
            "AI-supported progress and streak tracking",
        ],
        "button_label": "Get Middle Plan",
        "sort_order": 30,
    },
    {
        "slug": "secondary",
        "name": "Secondary School Prep Bundle",
        "category": "academic",
        "audience": "Grade 9-12 students",
        "target": "Grade 12 National Exams",
        "grade_range": "9-12",
        "access_scope": "secondary",
        "price": 2.50,
        "currency": "USD",
        "duration_months": 12,
        "features": [
            "Physics, Chemistry, Biology, and Mathematics",
            "Somali literature and humanities support",
            "Grade 12 national mock exams",
            "Personalized diagnostic reports",
            "AI coach study guidance",
        ],
        "button_label": "Get Secondary Plan",
        "sort_order": 40,
    },
    {
        "slug": "office-skills",
        "name": "Office Skills Student Bundle",
        "display_title": "Office Skills for Students",
        "category": "technology",
        "audience": "Middle and secondary school students",
        "target": "Grade 7-12 or students who want digital school skills",
        "grade_range": "7-12",
        "access_scope": "technology",
        "price": 3.00,
        "monthly_price": 1.00,
        "currency": "USD",
        "duration_months": 12,
        "features": [
            "Microsoft Word basics",
            "Microsoft Excel basics",
            "Microsoft PowerPoint basics",
            "Typing and document formatting",
            "School assignments and presentations",
            "Digital confidence for students",
        ],
        "button_label": "Get Office Skills Plan",
        "details_path": "/technology-skills/office",
        "sort_order": 60,
    },
    {
        "slug": "professional-tech",
        "name": "Professional Tech Skills Bundle",
        "display_title": "Professional Technology Skills",
        "category": "technology",
        "audience": "University students, graduates, unemployed youth, and working professionals",
        "target": "Career-ready digital skills",
        "grade_range": "",
        "access_scope": "technology",
        "price": 5.00,
        "monthly_price": 1.50,
        "currency": "USD",
        "duration_months": 12,
        "features": [
            "Data analysis",
            "Python programming",
            "C and C++ fundamentals",
            "Machine learning basics",
            "Practical projects",
            "Career-ready digital skills",
        ],
        "button_label": "Get Professional Tech Plan",
        "details_path": "/technology-skills/professional",
        "sort_order": 70,
    },
]


def _features_to_text(features) -> str:
    if isinstance(features, str):
        return features
    return json.dumps(features or [])


def _features_from_text(raw: Optional[str]) -> list[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return [str(item) for item in data]
    except Exception:
        pass
    return [line.strip() for line in raw.splitlines() if line.strip()]


def _slugify(value: Optional[str], fallback: str) -> str:
    raw = (value or "").strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", raw).strip("-")
    return slug or fallback


def _default_by_slug() -> dict[str, dict]:
    return {item["slug"]: item for item in DEFAULT_PACKAGES}


def _default_by_legacy_name() -> dict[str, dict]:
    mapping = _default_by_slug()
    return {
        "primary prep bundle": mapping["primary"],
        "middle prep bundle": mapping["middle"],
        "secondary prep bundle": mapping["secondary"],
    }


def _apply_default_fields(plan: models.SubscriptionPlan, item: dict) -> bool:
    changed = False
    defaults = {
        "name": item["name"],
        "display_title": item.get("display_title"),
        "category": item.get("category", "academic"),
        "audience": item.get("audience"),
        "target": item.get("target"),
        "grade_range": item.get("grade_range", ""),
        "access_scope": item.get("access_scope", "academic"),
        "price": item.get("price", 0),
        "monthly_price": item.get("monthly_price"),
        "currency": item.get("currency", "USD"),
        "duration_months": item.get("duration_months", 12),
        "features": _features_to_text(item.get("features")),
        "button_label": item.get("button_label"),
        "details_path": item.get("details_path"),
        "sort_order": item.get("sort_order", 100),
    }
    for key, value in defaults.items():
        current = getattr(plan, key, None)
        if current in (None, "") and value not in (None, ""):
            setattr(plan, key, value)
            changed = True
    return changed


def ensure_default_packages(db: Session) -> None:
    changed = False
    defaults_by_slug = _default_by_slug()
    legacy_names = _default_by_legacy_name()

    # Older SQLite databases may contain pre-catalog package rows with NULL
    # slugs. Preserve them for admin history, but keep them out of public plans.
    for plan in db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.slug.is_(None)).all():
        legacy = legacy_names.get((plan.name or "").strip().lower())
        if legacy:
            plan.slug = f"legacy-{legacy['slug']}-{plan.id}"
            plan.is_active = False
            _apply_default_fields(plan, legacy)
        else:
            plan.slug = f"{_slugify(plan.name, 'package')}-{plan.id}"
        changed = True

    for item in DEFAULT_PACKAGES:
        plan = db.query(models.SubscriptionPlan).filter(
            models.SubscriptionPlan.slug == item["slug"]
        ).order_by(models.SubscriptionPlan.id.asc()).first()
        if not plan:
            plan = models.SubscriptionPlan(
                slug=item["slug"],
                name=item["name"],
                display_title=item.get("display_title"),
                category=item.get("category", "academic"),
                audience=item.get("audience"),
                target=item.get("target"),
                grade_range=item.get("grade_range", ""),
                access_scope=item.get("access_scope", "academic"),
                price=item.get("price", 0),
                monthly_price=item.get("monthly_price"),
                currency=item.get("currency", "USD"),
                duration_months=item.get("duration_months", 12),
                features=_features_to_text(item.get("features")),
                button_label=item.get("button_label"),
                details_path=item.get("details_path"),
                is_active=True,
                sort_order=item.get("sort_order", 100),
            )
            db.add(plan)
            changed = True
        else:
            changed = _apply_default_fields(plan, item) or changed

        duplicate_plans = db.query(models.SubscriptionPlan).filter(
            models.SubscriptionPlan.slug == item["slug"],
            models.SubscriptionPlan.id != plan.id,
        ).all()
        for duplicate in duplicate_plans:
            duplicate.slug = f"duplicate-{item['slug']}-{duplicate.id}"
            duplicate.is_active = False
            changed = True

    if changed:
        db.commit()


def to_package_out(plan: models.SubscriptionPlan) -> schemas.PackagePlanOut:
    slug = plan.slug or f"{_slugify(plan.name, 'package')}-{plan.id}"
    return schemas.PackagePlanOut(
        id=plan.id,
        slug=slug,
        name=plan.name,
        title=plan.name,
        display_title=plan.display_title,
        category=plan.category,
        audience=plan.audience,
        target=plan.target,
        grade_range=plan.grade_range,
        access_scope=plan.access_scope,
        annual_price=plan.price,
        monthly_price=plan.monthly_price,
        currency=plan.currency,
        duration_months=plan.duration_months,
        is_active=plan.is_active,
        features=_features_from_text(plan.features),
        button_label=plan.button_label,
        details_path=plan.details_path,
        sort_order=plan.sort_order,
    )


def get_active_package(db: Session, slug: str) -> Optional[models.SubscriptionPlan]:
    ensure_default_packages(db)
    return db.query(models.SubscriptionPlan).filter(
        models.SubscriptionPlan.slug == slug,
        models.SubscriptionPlan.is_active == True,
    ).first()


def get_package_price(db: Session, slug: str, duration_months: int = 12) -> Optional[float]:
    plan = get_active_package(db, slug)
    if not plan or plan.duration_months != duration_months:
        return None
    return float(plan.price)


def get_package_name(db: Session, slug: str) -> str:
    plan = get_active_package(db, slug)
    return plan.name if plan else slug


@router.get("", response_model=List[schemas.PackagePlanOut])
def list_public_packages(db: Session = Depends(get_db)):
    ensure_default_packages(db)
    plans = db.query(models.SubscriptionPlan).filter(
        models.SubscriptionPlan.is_active == True
    ).order_by(models.SubscriptionPlan.sort_order.asc(), models.SubscriptionPlan.id.asc()).all()
    return [to_package_out(plan) for plan in plans]


@router.get("/admin", response_model=List[schemas.PackagePlanOut])
def list_admin_packages(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role(["admin"])),
):
    ensure_default_packages(db)
    plans = db.query(models.SubscriptionPlan).order_by(
        models.SubscriptionPlan.sort_order.asc(), models.SubscriptionPlan.id.asc()
    ).all()
    return [to_package_out(plan) for plan in plans]


@router.post("/admin", response_model=schemas.PackagePlanOut, status_code=status.HTTP_201_CREATED)
def create_admin_package(
    payload: schemas.PackagePlanCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role(["admin"])),
):
    ensure_default_packages(db)
    if db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.slug == payload.slug).first():
        raise HTTPException(status_code=400, detail="Package slug already exists.")
    plan = models.SubscriptionPlan(
        slug=payload.slug,
        name=payload.name,
        display_title=payload.display_title,
        category=payload.category,
        audience=payload.audience,
        target=payload.target,
        grade_range=payload.grade_range,
        access_scope=payload.access_scope,
        price=payload.annual_price,
        monthly_price=payload.monthly_price,
        currency=payload.currency,
        duration_months=payload.duration_months,
        features=_features_to_text(payload.features),
        button_label=payload.button_label,
        details_path=payload.details_path,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    log_admin_action(db, admin=admin, action_type="package_created", request=request, target_type="package", target_id=plan.id, new_value={"slug": plan.slug, "price": plan.price})
    db.commit()
    return to_package_out(plan)


@router.patch("/admin/{plan_id}", response_model=schemas.PackagePlanOut)
def update_admin_package(
    plan_id: int,
    payload: schemas.PackagePlanUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role(["admin"])),
):
    ensure_default_packages(db)
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Package not found.")
    changes = payload.model_dump(exclude_unset=True)
    if "slug" in changes and changes["slug"] != plan.slug:
        if db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.slug == changes["slug"]).first():
            raise HTTPException(status_code=400, detail="Package slug already exists.")
    for key, value in changes.items():
        if key == "annual_price":
            plan.price = value
        elif key == "features":
            plan.features = _features_to_text(value)
        else:
            setattr(plan, key, value)
    db.commit()
    db.refresh(plan)
    log_admin_action(db, admin=admin, action_type="package_updated", request=request, target_type="package", target_id=plan.id, new_value=changes)
    db.commit()
    return to_package_out(plan)


@router.delete("/admin/{plan_id}", response_model=schemas.PackagePlanOut)
def delete_admin_package(
    plan_id: int,
    request: Request,
    hard: bool = False,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role(["admin"])),
):
    """
    Deactivate a package (default), or permanently delete it with ?hard=true.
    Hard delete is refused while any user account still references the package,
    so existing subscriptions can never point at a missing plan.
    """
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Package not found.")

    subscriber_count = db.query(models.User).filter(models.User.package_type == plan.slug).count()

    if hard:
        if subscriber_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"{subscriber_count} account(s) still use this package. Deactivate it instead.",
            )
        removed = to_package_out(plan)
        log_admin_action(db, admin=admin, action_type="package_deleted", request=request, target_type="package", target_id=plan.id, old_value={"slug": plan.slug, "name": plan.name})
        db.delete(plan)
        db.commit()
        return removed

    plan.is_active = False
    db.commit()
    db.refresh(plan)
    log_admin_action(db, admin=admin, action_type="package_deactivated", request=request, target_type="package", target_id=plan.id, new_value={"slug": plan.slug, "is_active": False})
    db.commit()
    return to_package_out(plan)
