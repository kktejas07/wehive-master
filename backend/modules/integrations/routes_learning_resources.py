"""Learning Resources — Read-only curated list of visa training materials,
tutorials, guides, and reference documents.

Endpoints (all read-only, no create/update/delete):
  GET /api/learn/resources              — All resources (filterable)
  GET /api/learn/resources/categories   — Resource categories
  GET /api/learn/resources/{id}         — Single resource detail
  GET /api/learn/resources/search       — Search resources

Seeded from a static curated catalogue on module load.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional

router = APIRouter(prefix="/learn", tags=["learning-resources"])

CATEGORIES = [
    {"id": "visa-basics", "name": "Visa Basics", "icon": "Globe"},
    {"id": "document-prep", "name": "Document Preparation", "icon": "FileText"},
    {"id": "interview-prep", "name": "Interview Preparation", "icon": "Mic"},
    {"id": "country-guides", "name": "Country-Specific Guides", "icon": "Map"},
    {"id": "student-visa", "name": "Student Visa (F1)", "icon": "GraduationCap"},
    {"id": "work-visa", "name": "Work Visa (H1B/L1)", "icon": "Briefcase"},
    {"id": "tourist-visa", "name": "Tourist Visa (B1/B2)", "icon": "Plane"},
    {"id": "immigration-law", "name": "Immigration Law", "icon": "Scale"},
    {"id": "financial-planning", "name": "Financial Planning", "icon": "DollarSign"},
    {"id": "ai-tools", "name": "AI Tools & Automation", "icon": "Bot"},
    {"id": "open-source", "name": "Open Source Resources", "icon": "Code"},
]

RESOURCES = [
    {
        "id": "ds160-guide",
        "title": "Complete DS-160 Form Guide",
        "description": "Step-by-step walkthrough for filling the DS-160 nonimmigrant visa application form. Covers every section with screenshots.",
        "category": "visa-basics",
        "type": "guide",
        "difficulty": "beginner",
        "duration_minutes": 45,
        "url": "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/forms/ds-160-online-nonimmigrant-visa-application.html",
        "free": True,
        "tags": ["ds-160", "application", "us-visa", "beginner"],
    },
    {
        "id": "b1b2-checklist",
        "title": "B1/B2 Document Checklist",
        "description": "Complete checklist of required and recommended documents for US tourist/business visa application.",
        "category": "document-prep",
        "type": "checklist",
        "difficulty": "beginner",
        "duration_minutes": 15,
        "url": None,
        "free": True,
        "tags": ["b1", "b2", "tourist", "business", "documents", "checklist"],
    },
    {
        "id": "f1-interview-tips",
        "title": "F1 Student Visa Interview — Tips & Common Questions",
        "description": "Comprehensive interview preparation for F1 visa applicants. Includes 50+ common questions, sample answers, and tips from successful applicants.",
        "category": "interview-prep",
        "type": "guide",
        "difficulty": "intermediate",
        "duration_minutes": 30,
        "url": None,
        "free": True,
        "tags": ["f1", "student", "interview", "questions"],
    },
    {
        "id": "h1b-process",
        "title": "H1B Visa Process — From LCA to Stamping",
        "description": "End-to-end guide covering LCA filing, I-129 petition, premium processing, consular processing, and visa stamping.",
        "category": "work-visa",
        "type": "guide",
        "difficulty": "advanced",
        "duration_minutes": 60,
        "url": "https://www.uscis.gov/working-in-the-united-states/h-1b-specialty-occupations",
        "free": True,
        "tags": ["h1b", "work", "lca", "petition", "stamping"],
    },
    {
        "id": "passport-photo-specs",
        "title": "US Visa Passport Photo Specifications",
        "description": "Official photo requirements: size (2x2 inch), background (white), expression, glasses policy, head size, and resolution.",
        "category": "document-prep",
        "type": "reference",
        "difficulty": "beginner",
        "duration_minutes": 5,
        "url": "https://travel.state.gov/content/travel/en/passports/how-apply/photos.html",
        "free": True,
        "tags": ["photo", "passport", "specifications", "requirements"],
    },
    {
        "id": "visa-refusal-reasons",
        "title": "Understanding US Visa Refusal — Section 214(b) & 221(g)",
        "description": "Explains the most common visa refusal reasons, what 214(b) really means, how 221(g) administrative processing works, and strategies for reapplication.",
        "category": "immigration-law",
        "type": "reference",
        "difficulty": "advanced",
        "duration_minutes": 25,
        "url": None,
        "free": True,
        "tags": ["refusal", "214b", "221g", "rejection", "appeal"],
    },
    {
        "id": "financial-proof-guide",
        "title": "Financial Documentation for US Visa",
        "description": "How to present bank statements, ITR, salary slips, CA evaluation, and sponsor documents. What officers look for in financial proof.",
        "category": "financial-planning",
        "type": "guide",
        "difficulty": "intermediate",
        "duration_minutes": 20,
        "url": None,
        "free": True,
        "tags": ["bank-statement", "itr", "financial", "sponsor", "ca-report"],
    },
    {
        "id": "schengen-guide",
        "title": "Schengen Visa — Complete Guide for Indians",
        "description": "Covers application process, 90/180 day rule, travel insurance requirements, biometrics, and country-specific embassy procedures.",
        "category": "country-guides",
        "type": "guide",
        "difficulty": "intermediate",
        "duration_minutes": 35,
        "url": None,
        "free": True,
        "tags": ["schengen", "europe", "biometrics", "insurance"],
    },
    {
        "id": "uk-visa-guide",
        "title": "UK Standard Visitor Visa — Guide for Indians",
        "description": "Complete walkthrough of UK visitor visa application including VFS appointment booking, document upload, priority service, and biometrics.",
        "category": "country-guides",
        "type": "guide",
        "difficulty": "intermediate",
        "duration_minutes": 30,
        "url": "https://www.gov.uk/standard-visitor",
        "free": True,
        "tags": ["uk", "visitor", "vfs", "biometrics"],
    },
    {
        "id": "canada-visitor",
        "title": "Canada Visitor Visa (TRV) — Application Guide",
        "description": "Step-by-step for Canadian Temporary Resident Visa. IRCC portal navigation, document requirements, biometrics, processing times.",
        "category": "country-guides",
        "type": "guide",
        "difficulty": "intermediate",
        "duration_minutes": 30,
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html",
        "free": True,
        "tags": ["canada", "trv", "ircc", "biometrics"],
    },
    {
        "id": "ai-document-scanning",
        "title": "AI-Powered Document Scanning for Visa Applications",
        "description": "How our AI scans your passport and supporting documents, extracts key fields automatically, and pre-fills your application forms.",
        "category": "ai-tools",
        "type": "tutorial",
        "difficulty": "beginner",
        "duration_minutes": 10,
        "url": None,
        "free": True,
        "tags": ["ai", "scanning", "ocr", "automation", "passport"],
    },
    {
        "id": "open-source-visa-tools",
        "title": "Open Source Visa Preparation Toolkit",
        "description": "Curated list of free and open-source tools for visa preparation: form fillers, appointment trackers, document validators, and travel planners.",
        "category": "open-source",
        "type": "reference",
        "difficulty": "intermediate",
        "duration_minutes": 20,
        "url": None,
        "free": True,
        "tags": ["open-source", "tools", "free", "automation"],
    },
    {
        "id": "embassy-etiquette",
        "title": "Embassy Interview Etiquette & Dress Code",
        "description": "What to wear, how to greet officers, body language tips, things to never say, and cultural expectations at US consulates in India.",
        "category": "interview-prep",
        "type": "guide",
        "difficulty": "beginner",
        "duration_minutes": 15,
        "url": None,
        "free": True,
        "tags": ["etiquette", "dress-code", "interview", "embassy"],
    },
    {
        "id": "biometrics-guide",
        "title": "Biometrics Appointment — What to Expect",
        "description": "VFS Global biometrics process: what happens at the center, documents needed, photo capture, fingerprinting procedure, and common mistakes.",
        "category": "document-prep",
        "type": "guide",
        "difficulty": "beginner",
        "duration_minutes": 10,
        "url": None,
        "free": True,
        "tags": ["biometrics", "vfs", "fingerprints", "photo"],
    },
    {
        "id": "l1-visa-guide",
        "title": "L1 Intra-Company Transfer — Complete Guide",
        "description": "L1A (manager/executive) and L1B (specialized knowledge) visa requirements, blanket petition process, and supporting evidence.",
        "category": "work-visa",
        "type": "guide",
        "difficulty": "advanced",
        "duration_minutes": 40,
        "url": "https://www.uscis.gov/working-in-the-united-states/temporary-workers/l-1a-intracompany-transferee-executive-or-manager",
        "free": True,
        "tags": ["l1", "intra-company", "transfer", "manager"],
    },
]


@router.get("/resources")
async def list_resources(
    category: Optional[str] = None,
    type: Optional[str] = None,
    difficulty: Optional[str] = None,
    tag: Optional[str] = None,
    free_only: bool = False,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    results = list(RESOURCES)

    if category:
        results = [r for r in results if r["category"] == category]
    if type:
        results = [r for r in results if r["type"] == type]
    if difficulty:
        results = [r for r in results if r["difficulty"] == difficulty]
    if free_only:
        results = [r for r in results if r["free"]]
    if tag:
        results = [r for r in results if tag.lower() in [t.lower() for t in r["tags"]]]
    if search:
        search_lower = search.lower()
        results = [
            r for r in results
            if search_lower in r["title"].lower()
            or search_lower in r["description"].lower()
            or any(search_lower in t.lower() for t in r["tags"])
        ]

    total = len(results)
    paginated = results[offset:offset + limit]

    return {
        "ok": True,
        "total": total,
        "limit": limit,
        "offset": offset,
        "resources": paginated,
    }


@router.get("/resources/categories")
async def list_categories():
    return {"ok": True, "categories": CATEGORIES}


@router.get("/resources/{resource_id}")
async def get_resource(resource_id: str):
    for r in RESOURCES:
        if r["id"] == resource_id:
            return {"ok": True, "resource": r}
    raise HTTPException(status_code=404, detail="Resource not found")


@router.get("/resources/search")
async def search_resources(q: str = Query(..., min_length=2)):
    q_lower = q.lower()
    results = [
        r for r in RESOURCES
        if q_lower in r["title"].lower()
        or q_lower in r["description"].lower()
        or any(q_lower in t.lower() for t in r["tags"])
    ]
    return {"ok": True, "query": q, "count": len(results), "resources": results}
