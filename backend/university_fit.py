"""Transparent university fit scoring, used when no AI model answers (and as its baseline).

Every point comes from something the student told us or the university's own data,
and each score carries the reasons behind it, so nothing is a flat default.
"""
from __future__ import annotations

from typing import Optional

WEIGHTS = {"budget": 30, "english": 25, "rank": 20, "course": 15, "scholarship": 10}


def _num(v) -> Optional[float]:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def fit(u: dict, *, budget: Optional[int] = None, ielts: Optional[float] = None,
        courses: Optional[list[str]] = None, want_scholarship: bool = False) -> dict:
    """-> {"fit_score": 0-100, "reason": str, "strengths": [...], "concerns": [...]}"""
    score, strengths, concerns = 0.0, [], []

    tuition = _num(u.get("tuition_usd"))
    if budget and tuition is not None:
        if tuition <= budget:
            score += WEIGHTS["budget"]
            strengths.append("Free tuition" if tuition == 0 else f"Tuition ${tuition:,.0f}/yr is within your ${budget:,} budget")
        elif tuition <= budget * 1.25:
            score += WEIGHTS["budget"] / 2
            concerns.append(f"Tuition ${tuition:,.0f}/yr is a little over your budget")
        else:
            concerns.append(f"Tuition ${tuition:,.0f}/yr is well over your budget")
    elif tuition is not None:
        score += WEIGHTS["budget"] / 2

    need = _num(u.get("ielts_min"))
    if ielts and need:
        if ielts >= need + 0.5:
            score += WEIGHTS["english"]
            strengths.append(f"Your IELTS {ielts:g} is comfortably above the {need:g} minimum")
        elif ielts >= need:
            score += WEIGHTS["english"] * 0.8
            strengths.append(f"Your IELTS {ielts:g} meets the {need:g} minimum")
        else:
            concerns.append(f"Needs IELTS {need:g}; you have {ielts:g}")
    else:
        score += WEIGHTS["english"] / 2

    rank = _num(u.get("rank") or u.get("qs_rank"))
    if rank:
        score += WEIGHTS["rank"] * (1.0 if rank <= 100 else 0.75 if rank <= 300 else 0.5 if rank <= 800 else 0.3)
        if rank <= 100:
            strengths.append(f"Ranked #{rank:.0f} worldwide")

    offered = {str(c).lower() for c in (u.get("courses") or [])}
    wanted = {c.lower() for c in (courses or [])}
    if wanted:
        hit = sorted(wanted & offered)
        if hit:
            score += WEIGHTS["course"]
            strengths.append("Offers " + ", ".join(hit))
        else:
            concerns.append("Your preferred field isn't listed")
    else:
        score += WEIGHTS["course"] / 2

    if u.get("scholarships"):
        score += WEIGHTS["scholarship"]
        strengths.append("Offers scholarships")
    elif want_scholarship:
        concerns.append("No scholarships listed")

    reason = strengths[0] if strengths else "Matches your filters"
    if concerns:
        reason += f"; note: {concerns[0].lower()}"
    return {"fit_score": round(min(100.0, score)), "reason": reason + ".", "strengths": strengths[:4], "concerns": concerns[:3]}


def insights_from_data(u: dict, track: str) -> dict:
    """Admission facts and FAQs built only from the university's stored data."""
    name = u.get("name") or "This university"
    facts = []
    if u.get("acceptance_rate"):
        facts.append(f"Acceptance rate: about {u['acceptance_rate']}.")
    if u.get("rank") or u.get("qs_rank"):
        facts.append(f"World ranking: #{u.get('rank') or u.get('qs_rank')}.")
    if u.get("ielts_min"):
        facts.append(f"Minimum IELTS: {u['ielts_min']}.")
    tests = [t for t, k in (("GRE", "gre_required"), ("GMAT", "gmat_required")) if u.get(k)]
    facts.append(f"Requires {' and '.join(tests)}." if tests else "No GRE or GMAT listed as required.")
    if u.get("tuition_usd") is not None:
        facts.append(f"Tuition: about ${int(u['tuition_usd']):,} a year.")
    intakes = u.get("intakes")
    faqs = [
        {"q": f"When can I start a {track} programme?",
         "a": f"Listed intakes: {', '.join(intakes) if isinstance(intakes, list) else intakes}." if intakes
         else "Intakes vary by programme; WeHive will confirm the next one for you."},
        {"q": "Are scholarships available?",
         "a": "Yes, scholarships are listed for international students." if u.get("scholarships")
         else "No scholarships are listed; ask WeHive about external funding."},
        {"q": "What English score do I need?",
         "a": f"At least IELTS {u['ielts_min']} (or equivalent)." if u.get("ielts_min")
         else "Check the programme page; WeHive can confirm the requirement."},
    ]
    return {"insights": facts[:4], "faqs": faqs, "source": "wehive_data",
            "note": f"From WeHive's data for {name}. Confirm details on the university's website."}
