"""Document Readiness Agent — checks uploaded documents for completeness.

Validates:
- All required docs present for visa type (from REQUIRED_DOCS)
- File format compliance (PDF, JPG, PNG)
- File size within limits
- Passport scan has expiry > 6 months
- Photo meets requirements (format, size)
"""

from datetime import datetime, timedelta
from typing import List

from agents.document_validator import REQUIRED_DOCS, classify_doc_type, validate_file


async def check_missing_required_docs(db) -> List[dict]:
    """Check each application for missing required documents."""
    alerts = []
    cur = db["applications"].find({"status": {"$in": ["draft", "submitted"]}}).limit(50)
    async for app in cur:
        visa_type = app.get("visa_type", "tourist").lower()
        required = REQUIRED_DOCS.get(visa_type, REQUIRED_DOCS["tourist"])
        uploaded_docs = app.get("documents") or []
        uploaded_types = {classify_doc_type(d.get("filename", "")) for d in uploaded_docs}
        missing = []
        for req in required:
            found = False
            for kw in req.lower().split():
                for ut in uploaded_types:
                    if kw in ut or ut in kw:
                        found = True
                        break
            if not found:
                missing.append(req)
        if missing:
            alerts.append({
                "user_id": app.get("user_id"),
                "application_id": app["_id"],
                "type": "missing_documents",
                "severity": "critical",
                "message": (
                    f"Your {app.get('visa_type', 'visa')} application for "
                    f"{app.get('country_name', app.get('country_id', '')).upper()} "
                    f"is missing {len(missing)} required document(s):\n"
                    + "\n".join(f"  • {d}" for d in missing[:5])
                ),
            })
    return alerts


async def check_document_validity(db) -> List[dict]:
    """Check uploaded documents for format/size issues."""
    alerts = []
    cur = db["applications"].find({"documents": {"$exists": True, "$ne": []}}).limit(50)
    async for app in cur:
        for doc in app.get("documents", []):
            filename = doc.get("filename", "")
            size = doc.get("size", 0)
            result = validate_file(filename, size)
            if not result["valid"]:
                for issue in result["issues"]:
                    alerts.append({
                        "user_id": app.get("user_id"),
                        "application_id": app["_id"],
                        "type": f"invalid_document_{issue['field']}",
                        "severity": "critical" if issue.get("severity") == "critical" else "warning",
                        "message": f"Document '{filename}': {issue['message']}",
                    })
    return alerts


async def check_passport_validity(db) -> List[dict]:
    """Check scanned passports for expiry > 6 months."""
    alerts = []
    six_months = datetime.utcnow() + timedelta(days=180)
    cur = db["scans"].find({"kind": "passport", "extracted.passport_expiry": {"$ne": None}}).limit(30)
    async for scan in cur:
        expiry_str = scan.get("extracted", {}).get("passport_expiry", "")
        if not expiry_str:
            continue
        try:
            expiry = datetime.strptime(expiry_str, "%d-%m-%Y")
        except (ValueError, TypeError):
            try:
                expiry = datetime.strptime(expiry_str, "%Y-%m-%d")
            except (ValueError, TypeError):
                continue
        days_left = (expiry - datetime.utcnow()).days
        if days_left < 180 and days_left > 0:
            alerts.append({
                "user_id": scan.get("user_id"),
                "type": "passport_expiring_soon",
                "severity": "critical" if days_left < 60 else "warning",
                "message": (
                    f"Your passport expires in {days_left} days. "
                    f"{'Renew it immediately!' if days_left < 60 else 'Renew soon to avoid visa issues.'} "
                    "Most visas require 6 months validity."
                ),
            })
    return alerts


async def run_all_checks(db) -> List[dict]:
    """Run all document readiness checks."""
    results = []
    results.extend(await check_missing_required_docs(db))
    results.extend(await check_document_validity(db))
    results.extend(await check_passport_validity(db))
    return results
