"""People Intelligence — Internal risk scoring engine using only internal data.

No external API calls. Analyzes user profiles, application history, document
completeness, payment patterns, and behavioral signals to produce risk scores.

Endpoints:
  GET  /api/people/risk-score/{user_id}        — Full risk profile for a user
  GET  /api/people/risk-score/me                — Risk profile for current user
  GET  /api/people/risk-factors/{user_id}       — Detailed risk factor breakdown
  GET  /api/people/risk-summary                 — Organisation-wide risk summary
"""

from datetime import datetime

from fastapi import APIRouter, Depends

from auth_utils import get_current_user
from db import db, users, applications

router = APIRouter(prefix="/people", tags=["people-intelligence"])


async def _compute_risk_score(user_id: str) -> dict:
    """Internal-only risk scoring based on 7 factors."""

    user = await users.find_one({"_id": user_id})
    if not user:
        return {"score": 0, "level": "unknown", "error": "User not found"}

    apps_cursor = applications.find({"user_id": user_id})
    apps = await apps_cursor.to_list(50)

    factors = {}
    total_weight = 0
    weighted_score = 0

    profile_completeness = _score_profile_completeness(user)
    factors["profile_completeness"] = profile_completeness
    weighted_score += profile_completeness["score"] * 0.15
    total_weight += 0.15

    application_history = _score_application_history(apps)
    factors["application_history"] = application_history
    weighted_score += application_history["score"] * 0.25
    total_weight += 0.25

    document_readiness = _score_document_readiness(apps)
    factors["document_readiness"] = document_readiness
    weighted_score += document_readiness["score"] * 0.20
    total_weight += 0.20

    payment_reliability = await _score_payment_reliability(user_id)
    factors["payment_reliability"] = payment_reliability
    weighted_score += payment_reliability["score"] * 0.15
    total_weight += 0.15

    behavioral_signals = _score_behavioral_signals(user, apps)
    factors["behavioral_signals"] = behavioral_signals
    weighted_score += behavioral_signals["score"] * 0.15
    total_weight += 0.15

    refusals = _score_refusal_history(apps)
    factors["refusal_history"] = refusals
    weighted_score += refusals["score"] * 0.10
    total_weight += 0.10

    raw_score = round(weighted_score / total_weight, 1) if total_weight > 0 else 50

    if raw_score >= 80:
        level = "low_risk"
    elif raw_score >= 60:
        level = "moderate_risk"
    elif raw_score >= 35:
        level = "elevated_risk"
    else:
        level = "high_risk"

    return {
        "user_id": user_id,
        "score": raw_score,
        "level": level,
        "factors": factors,
        "computed_at": datetime.utcnow().isoformat(),
        "recommendation": _get_recommendation(level, factors),
    }


def _score_profile_completeness(user: dict) -> dict:
    fields = ["name", "phone", "email", "date_of_birth", "address", "passport_number", "nationality"]
    completed = sum(1 for f in fields if user.get(f))
    ratio = completed / len(fields)
    score = round(ratio * 100)
    return {
        "score": score,
        "label": f"{completed}/{len(fields)} fields complete",
        "details": "Profile completeness affects verification readiness",
    }


def _score_application_history(apps: list[dict]) -> dict:
    if not apps:
        return {"score": 50, "label": "No applications", "details": "No visa application history on file"}

    approved = sum(1 for a in apps if a.get("status") == "approved")
    rejected = sum(1 for a in apps if a.get("status") == "rejected")
    submitted = sum(1 for a in apps if a.get("status") in ("submitted", "in_review"))

    if rejected > 0:
        ratio = approved / max(rejected, 1)
        score = max(10, min(80, round(ratio * 50 + 30)))
    else:
        score = 75 if approved > 0 else 50

    return {
        "score": score,
        "label": f"{approved} approved, {rejected} rejected, {submitted} active",
        "details": "Approval-to-rejection ratio and application volume signal reliability",
    }


def _score_document_readiness(apps: list[dict]) -> dict:
    active = [a for a in apps if a.get("status") in ("draft", "submitted", "in_review")]
    if not active:
        return {"score": 60, "label": "No active applications", "details": "No documents currently under review"}

    docs_present = 0
    for app in active:
        docs = app.get("documents", [])
        docs_present += len(docs) if isinstance(docs, list) else 0

    avg_docs = docs_present / len(active) if active else 0
    score = min(100, round(avg_docs * 15 + 30))

    return {
        "score": score,
        "label": f"~{avg_docs:.1f} docs per application",
        "details": "Document quantity and type coverage indicate preparation level",
    }


async def _score_payment_reliability(user_id: str) -> dict:
    payments_cursor = db["payments"].find({"user_id": user_id, "status": "captured"})
    payments = await payments_cursor.to_list(50)

    if not payments:
        return {"score": 50, "label": "No payment history", "details": "No completed payments on record"}

    on_time = sum(1 for p in payments if p.get("payment_status") == "captured")
    total_amount = sum(p.get("amount", 0) for p in payments)

    score = 75 if on_time > 0 else 50
    if total_amount > 1000:
        score = min(100, score + 10)

    return {
        "score": score,
        "label": f"₹{total_amount:.0f} across {len(payments)} payments",
        "details": "Payment history and amount indicate financial commitment",
    }


def _score_behavioral_signals(user: dict, apps: list[dict]) -> dict:
    score = 60
    signals = []

    created_days = (datetime.utcnow() - user.get("created_at", datetime.utcnow())).days
    if created_days > 30 and len(apps) == 0:
        score -= 20
        signals.append("Long-standing account with no applications")
    elif created_days < 7 and len(apps) > 2:
        score -= 15
        signals.append("Rapid application creation may indicate urgency")
    else:
        signals.append("Normal activity patterns")

    if apps:
        latest = max(a.get("created_at", datetime.min) for a in apps if a.get("created_at"))
        days_since = (datetime.utcnow() - latest).days if isinstance(latest, datetime) else 0
        if days_since < 3:
            score += 10
            signals.append("Recent application activity")

    return {
        "score": max(5, min(95, score)),
        "label": "; ".join(signals),
        "details": "Behavioral patterns: activity frequency, account age, and timing",
    }


def _score_refusal_history(apps: list[dict]) -> dict:
    refused = [a for a in apps if a.get("status") == "rejected"]
    if not refused:
        return {"score": 85, "label": "No refusals", "details": "Clean application history"}

    ratio = len(refused) / max(len(apps), 1)
    score = max(10, round((1 - ratio) * 100))

    return {
        "score": score,
        "label": f"{len(refused)} refusal(s) out of {len(apps)} applications",
        "details": "Previous refusals may indicate application quality concerns",
    }


def _get_recommendation(level: str, factors: dict) -> str:
    if level == "low_risk":
        return "Applicant is well-prepared. Proceed with standard processing."
    elif level == "moderate_risk":
        return "Minor concerns. Verify documents and ensure application completeness before submission."
    elif level == "elevated_risk":
        return "Several risk factors detected. Recommend document review, interview prep, and financial verification."
    else:
        return "High risk profile. Manual review required. Address refusal history and profile gaps first."


@router.get("/risk-score/me")
async def my_risk_score(user=Depends(get_current_user)):
    result = await _compute_risk_score(user["_id"])
    return {"ok": True, **result}


@router.get("/risk-score/{user_id}")
async def get_risk_score(user_id: str, user=Depends(get_current_user)):
    if user.get("role") not in ("admin", "agent"):
        return {"ok": False, "detail": "Access denied"}
    result = await _compute_risk_score(user_id)
    return {"ok": True, **result}


@router.get("/risk-factors/{user_id}")
async def get_risk_factors(user_id: str, user=Depends(get_current_user)):
    if user.get("role") not in ("admin", "agent"):
        return {"ok": False, "detail": "Access denied"}
    risk = await _compute_risk_score(user_id)
    return {
        "ok": True,
        "user_id": user_id,
        "factors": risk["factors"],
        "score": risk["score"],
        "level": risk["level"],
    }


@router.get("/risk-summary")
async def risk_summary(user=Depends(get_current_user)):
    if user.get("role") not in ("admin",):
        return {"ok": False, "detail": "Admin access required"}

    all_apps = await applications.find().to_list(1000)
    all_users = await users.find().to_list(500)

    total_rejected = sum(1 for a in all_apps if a.get("status") == "rejected")
    total_approved = sum(1 for a in all_apps if a.get("status") == "approved")
    total = len(all_apps)

    draft_count = sum(1 for a in all_apps if a.get("status") == "draft")
    stalled_count = sum(
        1 for a in all_apps if a.get("status") == "draft"
        and (datetime.utcnow() - a.get("created_at", datetime.utcnow())).days > 14
    )

    incomplete_profiles = sum(
        1 for u in all_users
        if not all(u.get(f) for f in ["name", "phone", "passport_number"])
    )

    return {
        "ok": True,
        "total_users": len(all_users),
        "total_applications": total,
        "approval_rate": f"{(total_approved / max(total, 1)) * 100:.1f}%",
        "rejection_rate": f"{(total_rejected / max(total, 1)) * 100:.1f}%",
        "draft_count": draft_count,
        "draft_stalled_14d": stalled_count,
        "incomplete_profiles": incomplete_profiles,
        "computed_at": datetime.utcnow().isoformat(),
    }
