"""Document Validation Agent — checks uploaded docs for common issues before submission.

Validates:
- Passport: expiry > 6 months, file format, size
- Photo: format, dimensions (if detectable)
- Documents: required docs present for visa type, file validity
"""

from datetime import datetime, timedelta
from typing import List, Optional

from shared.data import get_country

REQUIRED_DOCS = {
    "tourist": [
        "Passport (6mo validity)",
        "Passport-size photo",
        "Bank statements (3 months)",
        "Confirmed flight & hotel",
        "Travel insurance",
    ],
    "business": [
        "Passport (6mo validity)",
        "Passport-size photo",
        "Invitation letter",
        "Bank statements (6 months)",
        "Cover letter from employer",
        "Business registration",
    ],
    "student": [
        "Passport (6mo validity)",
        "Passport-size photo",
        "University admit letter",
        "Financial sponsor proof",
        "Academic transcripts",
        "Standardized test scores",
    ],
    "work": [
        "Passport (6mo validity)",
        "Passport-size photo",
        "Job offer letter",
        "Employer sponsorship",
        "Educational degrees",
        "Police clearance",
    ],
}

DOC_TYPE_KEYWORDS = {
    "passport": ["passport", "passport_scan", "id_proof"],
    "photo": ["photo", "photograph", "picture"],
    "bank_statement": ["bank", "statement", "fund"],
    "flight": ["flight", "itinerary", "ticket", "airline"],
    "hotel": ["hotel", "booking", "accommodation"],
    "insurance": ["insurance", "travel_insurance"],
    "admit_letter": ["admit", "acceptance", "offer_letter", "university_letter"],
    "transcript": ["transcript", "marksheet", "grades", "academic"],
    "test_scores": ["ielts", "toefl", "gre", "gmat", "test_score"],
    "invitation": ["invitation", "invite"],
    "employer_letter": ["employer", "cover_letter", "noc"],
    "degree": ["degree", "certificate", "diploma"],
    "police": ["police", "clearance", "background_check"],
    "sponsor": ["sponsor", "financial", "financial_proof", "affidavit"],
}


def classify_doc_type(filename: str) -> str:
    """Classify a document type from its filename."""
    import re
    name = filename.lower().replace("_", " ").replace("-", " ")
    for doc_type, keywords in DOC_TYPE_KEYWORDS.items():
        for kw in keywords:
            test_kw = kw.replace("_", " ").replace("-", " ")
            if re.search(r'\b' + re.escape(test_kw) + r'\b', name):
                return doc_type
    return "other"


def validate_passport_expiry(expiry_date_str: Optional[str]) -> dict:
    """Check if passport has > 6 months validity."""
    if not expiry_date_str:
        return {"valid": False, "issue": "Passport expiry date not found", "severity": "critical"}
    try:
        expiry = datetime.strptime(expiry_date_str, "%Y-%m-%d")
        six_months = timedelta(days=180)
        if expiry < datetime.utcnow():
            return {"valid": False, "issue": "Passport is expired", "severity": "critical"}
        if expiry < datetime.utcnow() + six_months:
            days_left = (expiry - datetime.utcnow()).days
            return {
                "valid": False,
                "issue": f"Passport expires in {days_left} days (need ≥ 180)",
                "severity": "warning",
            }
        return {"valid": True, "issue": None, "severity": "ok"}
    except ValueError:
        return {"valid": False, "issue": "Could not parse passport expiry date", "severity": "warning"}


def validate_file(filename: str, size_bytes: int) -> dict:
    """Validate a single uploaded file."""
    issues = []
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    allowed_exts = {"pdf", "jpg", "jpeg", "png", "webp", "tiff", "heic"}
    if ext not in allowed_exts:
        issues.append({"field": "format", "message": f"Unsupported format: .{ext}", "severity": "critical"})
    max_size = 8 * 1024 * 1024
    if size_bytes > max_size:
        issues.append(
            {
                "field": "size",
                "message": f"File too large: {size_bytes / 1024 / 1024:.1f}MB (max 8MB)",
                "severity": "critical",
            }
        )
    if size_bytes == 0:
        issues.append({"field": "size", "message": "File is empty", "severity": "critical"})
    return {
        "filename": filename,
        "size": size_bytes,
        "classified_as": classify_doc_type(filename),
        "valid": len(issues) == 0,
        "issues": issues,
    }


def check_required_docs(uploaded_docs: List[dict], visa_type: str) -> List[dict]:
    """Check which required documents are missing."""
    required = REQUIRED_DOCS.get(visa_type.lower(), REQUIRED_DOCS["tourist"])
    uploaded_types = {classify_doc_type(d.get("filename", "")) for d in uploaded_docs}
    results = []
    for req in required:
        found = False
        for kw in req.lower().split():
            for ut in uploaded_types:
                if kw in ut or ut in kw:
                    found = True
                    break
        results.append(
            {
                "document": req,
                "present": found,
                "severity": "critical" if not found else "ok",
            }
        )
    return results


async def validate_application_docs(
    country_id: str,
    visa_type: str,
    uploaded_docs: List[dict],
    passport_expiry: Optional[str] = None,
) -> dict:
    """Full document validation for a visa application."""
    checks = []

    for doc in uploaded_docs:
        checks.append(validate_file(doc.get("filename", "unknown"), doc.get("size", 0)))

    required_check = check_required_docs(uploaded_docs, visa_type)
    checks.append({"type": "required_docs", "items": required_check})

    if passport_expiry:
        passport_check = validate_passport_expiry(passport_expiry)
        checks.append({"type": "passport_expiry", **passport_check})

    country_data = get_country(country_id)
    country_name = (country_data or {}).get("name", country_id)

    critical = sum(
        1
        for c in checks
        if c.get("severity") == "critical" or any(i.get("severity") == "critical" for i in c.get("items", []))
    )
    warnings = sum(
        1
        for c in checks
        if c.get("severity") == "warning" or any(i.get("severity") == "warning" for i in c.get("items", []))
    )

    return {
        "application": {"country": country_name, "visa_type": visa_type},
        "verdict": "pass" if critical == 0 else "fail",
        "summary": {"critical": critical, "warnings": warnings, "passed": len(checks)},
        "checks": checks,
    }
