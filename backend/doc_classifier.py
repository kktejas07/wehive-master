"""Document auto-classification — two-pass ordered-rules classifier.

Pass 1: filename only  (highest-signal, cheapest)
Pass 2: OCR text       (only when pass 1 matches nothing)

Never build one concatenated haystack of filename+OCR text.
Short tokens (≤4 chars) are matched with word-boundary regex to prevent
"ead" → "already", "perm" → "permanent", etc.

Usage
-----
    result = classify(filename="green_card.pdf", ocr_text="")
    # → ClassifyResult(doc_type="green_card", doc_category="Immigration",
    #                  subfolder="Immigration Evidence",
    #                  matched_via="filename", confidence=1.0,
    #                  canonical_doc_name="Green Card (Permanent Resident Card)")
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class ClassifyResult:
    doc_type: str                  # snake_case identifier
    canonical_doc_name: str        # human-readable name
    doc_category: str              # closed set: Identity/Immigration/Employment/Payroll/Other
    subfolder: str                 # fixed vocabulary subfolder name
    matched_via: str               # 'filename' | 'ocr' | 'learned' | 'manual'
    confidence: float              # 0.0–1.0
    is_checklist: bool             # True = required by business; False = custom upload


# ---------------------------------------------------------------------------
# Closed-set vocabulary
# ---------------------------------------------------------------------------

CATEGORIES = frozenset(["Identity", "Immigration", "Employment", "Payroll", "Other"])

SUBFOLDERS = frozenset([
    "Government ID",
    "Immigration Evidence",
    "Visa & Travel",
    "Education",
    "Employment Contracts",
    "Employer Documents",
    "Tax Documents",
    "Pay Stubs",
    "Other",
])


# ---------------------------------------------------------------------------
# Rules table
# (tokens, canonical_doc_name, doc_type, doc_category, subfolder, is_checklist)
#
# ORDER MATTERS — contracts and employer-owned agreements FIRST so they cannot
# land in the worker's evidence bucket.
# ---------------------------------------------------------------------------

_RULES: list[tuple[list[str], str, str, str, str, bool]] = [
    # ── Employer-owned agreements (must come before general "offer") ─────────
    (["offer letter", "offer ltr"],
     "Offer Letter", "offer_letter",
     "Employment", "Employment Contracts", True),

    (["employment contract", "employment agreement", "work contract"],
     "Employment Contract", "employment_contract",
     "Employment", "Employment Contracts", True),

    (["nda", "non disclosure", "non-disclosure", "confidentiality agreement"],
     "NDA / Confidentiality Agreement", "nda",
     "Employment", "Employment Contracts", False),

    (["non compete", "non-compete"],
     "Non-Compete Agreement", "non_compete",
     "Employment", "Employment Contracts", False),

    # ── Government USCIS / immigration notices (before short "visa" token) ──
    (["i-485", "i485", "adjustment of status"],
     "I-485 Adjustment of Status", "i485",
     "Immigration", "Immigration Evidence", True),

    (["i-140", "i140", "immigrant petition"],
     "I-140 Immigrant Petition", "i140",
     "Immigration", "Immigration Evidence", True),

    (["i-130", "i130", "petition for alien relative"],
     "I-130 Petition", "i130",
     "Immigration", "Immigration Evidence", True),

    (["i-765", "i765", "employment authorization"],
     "I-765 Employment Authorization Application", "i765",
     "Immigration", "Immigration Evidence", True),

    (["i-131", "i131", "advance parole"],
     "I-131 Advance Parole", "i131",
     "Immigration", "Immigration Evidence", True),

    (["i-539", "i539"],
     "I-539 Extension of Stay", "i539",
     "Immigration", "Immigration Evidence", True),

    (["i-864", "i864", "affidavit of support"],
     "I-864 Affidavit of Support", "i864",
     "Immigration", "Immigration Evidence", True),

    (["approval notice", "notice of approval", "receipt notice", "i-797", "i797"],
     "USCIS Approval / Receipt Notice (I-797)", "i797",
     "Immigration", "Immigration Evidence", True),

    # ── EAD — only long token; never from substring "ead" in OCR ───────────
    (["ead card", "employment authorization document", "work permit"],
     "EAD Card (Employment Authorization)", "ead_card",
     "Immigration", "Immigration Evidence", True),

    # ── PERM labour certification ────────────────────────────────────────────
    (["perm labor cert", "perm labour cert", "labor certification", "labour certification",
      "9089", "form 9089"],
     "PERM Labor Certification", "perm_labor_cert",
     "Immigration", "Immigration Evidence", True),

    # ── Green card / permanent resident ─────────────────────────────────────
    (["green card", "permanent resident card", "i-551", "i551", "alien registration"],
     "Green Card (Permanent Resident Card)", "green_card",
     "Immigration", "Immigration Evidence", True),

    # ── H-1B / L-1 / O-1 / TN / other work visas ───────────────────────────
    (["h1b", "h-1b", "specialty occupation"],
     "H-1B Visa / Petition", "h1b",
     "Immigration", "Visa & Travel", True),

    (["l1", "l-1", "intracompany transfer"],
     "L-1 Intracompany Transfer Visa", "l1",
     "Immigration", "Visa & Travel", True),

    (["o1", "o-1", "extraordinary ability"],
     "O-1 Extraordinary Ability Visa", "o1",
     "Immigration", "Visa & Travel", False),

    (["tn visa", "tn status", "trade nafta"],
     "TN Visa (Trade NAFTA)", "tn_visa",
     "Immigration", "Visa & Travel", False),

    (["f1", "f-1", "student visa", "opt", "cpt"],
     "F-1 / Student Visa / OPT / CPT", "f1_student",
     "Immigration", "Visa & Travel", True),

    (["j1", "j-1", "exchange visitor"],
     "J-1 Exchange Visitor Visa", "j1",
     "Immigration", "Visa & Travel", False),

    (["b1", "b-1", "b2", "b-2", "tourist visa", "visitor visa", "b1b2"],
     "B-1/B-2 Visitor / Tourist Visa", "b1b2_visa",
     "Immigration", "Visa & Travel", False),

    (["visa stamp", "visa page", "visa sticker"],
     "Visa Stamp", "visa_stamp",
     "Immigration", "Visa & Travel", True),

    # ── Identity documents ───────────────────────────────────────────────────
    (["passport", "passport scan", "passport copy", "travel document"],
     "Passport", "passport",
     "Identity", "Government ID", True),

    (["birth certificate", "birth cert"],
     "Birth Certificate", "birth_certificate",
     "Identity", "Government ID", True),

    (["marriage certificate", "marriage cert"],
     "Marriage Certificate", "marriage_certificate",
     "Identity", "Government ID", False),

    (["national id", "national identity", "aadhar", "aadhaar", "pan card",
      "voter id", "voter card"],
     "National Identity Document", "national_id",
     "Identity", "Government ID", True),

    # ── Tax / Payroll ────────────────────────────────────────────────────────
    (["w2", "w-2", "wage tax statement"],
     "W-2 Wage & Tax Statement", "w2",
     "Payroll", "Tax Documents", True),

    (["w4", "w-4", "withholding"],
     "W-4 Withholding Certificate", "w4",
     "Payroll", "Tax Documents", True),

    (["1099", "misc income", "independent contractor tax"],
     "1099 / Misc Income Statement", "1099",
     "Payroll", "Tax Documents", True),

    (["tax return", "irs return", "1040", "income tax return"],
     "Tax Return (IRS 1040 / IT Return)", "tax_return",
     "Payroll", "Tax Documents", True),

    (["pay stub", "paystub", "payslip", "pay slip", "salary slip", "earnings statement"],
     "Pay Stub / Payslip", "pay_stub",
     "Payroll", "Pay Stubs", True),

    # ── Employment / HR ──────────────────────────────────────────────────────
    (["experience letter", "experience certificate", "service certificate",
      "relieving letter", "separation letter"],
     "Experience / Relieving Letter", "experience_letter",
     "Employment", "Employer Documents", True),

    (["bank statement", "bank account statement", "account statement", "savings statement"],
     "Bank Statement", "bank_statement",
     "Employment", "Employer Documents", True),

    (["degree certificate", "bachelor degree", "master degree", "phd certificate",
      "convocation certificate"],
     "Degree Certificate", "degree_certificate",
     "Education", "Education", True),

    (["academic transcript", "mark sheet", "marksheet", "grade report",
      "academic record", "transcript"],
     "Academic Transcript / Mark Sheet", "transcript",
     "Education", "Education", True),

    (["police clearance", "background check", "criminal record check", "good conduct"],
     "Police Clearance Certificate", "police_clearance",
     "Identity", "Government ID", False),

    (["medical exam", "medical certificate", "vaccination record", "vaccine card",
      "immunization record"],
     "Medical / Vaccination Record", "medical_record",
     "Identity", "Government ID", False),

    # ── Travel ───────────────────────────────────────────────────────────────
    (["flight booking", "flight itinerary", "airline ticket", "flight ticket",
      "air ticket"],
     "Flight Itinerary / Ticket", "flight_itinerary",
     "Immigration", "Visa & Travel", False),

    (["hotel booking", "hotel reservation", "accommodation booking",
      "airbnb reservation"],
     "Hotel / Accommodation Booking", "hotel_booking",
     "Immigration", "Visa & Travel", False),

    (["travel insurance", "medical insurance policy", "insurance policy"],
     "Travel / Medical Insurance", "travel_insurance",
     "Immigration", "Visa & Travel", False),

    # ── Catch-all ────────────────────────────────────────────────────────────
    ([], "Other / Custom Upload", "other", "Other", "Other", False),
]


# ---------------------------------------------------------------------------
# Tokens that are trusted from the filename only (never from OCR text)
# ---------------------------------------------------------------------------
_FILENAME_ONLY_TOKENS = frozenset([
    "visa", "ssn", "gc", "dl", "i9",
])


# ---------------------------------------------------------------------------
# Compiled rule cache
# ---------------------------------------------------------------------------

def _word_boundary_re(token: str) -> re.Pattern:
    """Word-boundary regex; short tokens (≤4 chars) need stricter boundaries."""
    esc = re.escape(token)
    if len(token) <= 4:
        return re.compile(r"(?<![a-z0-9])" + esc + r"(?![a-z0-9])", re.I)
    return re.compile(esc, re.I)


_COMPILED: list[tuple[list[re.Pattern], str, str, str, str, bool]] = [
    ([_word_boundary_re(t) for t in tokens], cname, dtype, cat, sub, checklist)
    for tokens, cname, dtype, cat, sub, checklist in _RULES
    if tokens  # skip catch-all
]


def _normalise(text: str) -> str:
    """Lowercase; replace any non-alphanumeric run with a single space."""
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def _match_rules(haystack: str, filename_only: bool) -> Optional[tuple[str, str, str, str, bool]]:
    """Return (cname, dtype, category, subfolder, is_checklist) or None."""
    for patterns, cname, dtype, cat, sub, checklist in _COMPILED:
        for pat in patterns:
            token_text = pat.pattern.strip(r"(?<![a-z0-9])(?![a-z0-9])").replace(r"(?<![a-z0-9])", "").replace(r"(?![a-z0-9])", "")
            # For filename_only=False (OCR pass), skip tokens in the exclusion set
            if not filename_only:
                raw_token = pat.pattern
                # Extract the token from the regex pattern
                # Simple heuristic: if any filename-only token is in the original patterns list
                # We re-check by looking at the token text directly
                pass
            if pat.search(haystack):
                return cname, dtype, cat, sub, checklist
    return None


def _match_rules_v2(
    haystack: str,
    filename_only: bool,
    rules_ref: list[tuple[list[str], str, str, str, str, bool]],
) -> Optional[tuple[str, str, str, str, bool]]:
    """Clean implementation — iterate original rules table directly."""
    for tokens, cname, dtype, cat, sub, checklist in rules_ref:
        if not tokens:
            continue
        for token in tokens:
            # Skip filename-only tokens when scanning OCR text
            if not filename_only:
                # Check if any part of this token starts with a filename-only short token
                tok_lower = token.lower().strip()
                if any(tok_lower == fo or tok_lower.startswith(fo + " ") for fo in _FILENAME_ONLY_TOKENS):
                    continue

            norm_token = _normalise(token)
            # Short tokens → word-boundary match
            if len(norm_token.replace(" ", "")) <= 4:
                pat = re.compile(r"(?<![a-z0-9])" + re.escape(norm_token) + r"(?![a-z0-9])", re.I)
            else:
                pat = re.compile(re.escape(norm_token), re.I)

            if pat.search(haystack):
                return cname, dtype, cat, sub, checklist
    return None


# SOC-code special predicate: NN-NNNN.NN
_SOC_RE = re.compile(r"\b\d{2}-\d{4}(?:\.\d{2})?\b")

# I-9 predicate: matches "i9" or "i 9" (post-normalise) but NOT "i 94"/"i 797".
# After _normalise(), hyphens/underscores collapse to spaces, so "i-9" → "i 9".
_I9_RE = re.compile(r"\bi\s?9\b(?!\s*[0-9])", re.I)


def classify(
    filename: str,
    ocr_text: str = "",
    learned_correction: Optional[str] = None,
) -> ClassifyResult:
    """Two-pass classifier.  Returns a ClassifyResult.

    Parameters
    ----------
    filename            : original filename (or normalised equivalent)
    ocr_text            : text extracted by OCR (may be empty)
    learned_correction  : if a staff correction exists for this exact filename,
                          pass the corrected doc_type here — it wins unconditionally.
    """
    # ── Learned correction wins over everything ──────────────────────────────
    if learned_correction:
        for tokens, cname, dtype, cat, sub, checklist in _RULES:
            if dtype == learned_correction:
                return ClassifyResult(
                    doc_type=dtype,
                    canonical_doc_name=cname,
                    doc_category=cat,
                    subfolder=sub,
                    matched_via="learned",
                    confidence=1.0,
                    is_checklist=checklist,
                )

    norm_name = _normalise(filename)

    # ── Special predicates on filename ───────────────────────────────────────
    if _I9_RE.search(norm_name):
        return ClassifyResult(
            doc_type="i9",
            canonical_doc_name="I-9 Employment Eligibility Verification",
            doc_category="Employment",
            subfolder="Employer Documents",
            matched_via="filename",
            confidence=0.95,
            is_checklist=True,
        )
    if _SOC_RE.search(norm_name):
        return ClassifyResult(
            doc_type="soc_code_doc",
            canonical_doc_name="SOC Code Reference Document",
            doc_category="Employment",
            subfolder="Employer Documents",
            matched_via="filename",
            confidence=0.9,
            is_checklist=False,
        )

    # ── Pass 1: filename ──────────────────────────────────────────────────────
    hit = _match_rules_v2(norm_name, filename_only=True, rules_ref=_RULES)
    if hit:
        cname, dtype, cat, sub, checklist = hit
        return ClassifyResult(
            doc_type=dtype,
            canonical_doc_name=cname,
            doc_category=cat,
            subfolder=sub,
            matched_via="filename",
            confidence=0.9,
            is_checklist=checklist,
        )

    # ── Pass 2: OCR text ──────────────────────────────────────────────────────
    if ocr_text:
        norm_ocr = _normalise(ocr_text[:5000])  # limit to first 5 KB for speed
        hit = _match_rules_v2(norm_ocr, filename_only=False, rules_ref=_RULES)
        if hit:
            cname, dtype, cat, sub, checklist = hit
            return ClassifyResult(
                doc_type=dtype,
                canonical_doc_name=cname,
                doc_category=cat,
                subfolder=sub,
                matched_via="ocr",
                confidence=0.7,
                is_checklist=checklist,
            )

    # ── Catch-all ─────────────────────────────────────────────────────────────
    return ClassifyResult(
        doc_type="other",
        canonical_doc_name="Other / Custom Upload",
        doc_category="Other",
        subfolder="Other",
        matched_via="filename",
        confidence=0.1,
        is_checklist=False,
    )
