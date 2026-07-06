"""Training Hub — Course catalog, enrollment, progress tracking,
recommendations, certificates, and mandatory training compliance.

Endpoints:
  GET  /api/training/catalog              Training course catalog
  POST /api/training/enroll               Enroll in a course
  GET  /api/training/progress             User training progress
  POST /api/training/progress/update      Update progress for a course
  GET  /api/training/recommend            AI-powered course recommendations
  GET  /api/training/certificates         User certificates
  POST /api/training/certificates/generate Generate certificate
  GET  /api/training/mandatory            Mandatory training compliance
"""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_utils import get_current_user
from db import db

router = APIRouter(prefix="/training", tags=["training"])

TRAINING_CATALOG = [
    {
        "id": "visa-101",
        "title": "US Visa Fundamentals",
        "description": "Master the fundamentals of US visa types, requirements, and application processes.",
        "category": "visa",
        "difficulty": "beginner",
        "duration_hours": 4,
        "modules": 8,
        "certificate": True,
        "mandatory": False,
        "skills": ["visa-types", "ds-160", "application-process"],
    },
    {
        "id": "visa-201",
        "title": "Advanced Visa Consultation",
        "description": "Deep dive into complex visa scenarios, refusal handling, and legal frameworks.",
        "category": "visa",
        "difficulty": "advanced",
        "duration_hours": 8,
        "modules": 12,
        "certificate": True,
        "mandatory": True,
        "skills": ["refusal-handling", "legal-framework", "case-management"],
    },
    {
        "id": "docs-101",
        "title": "Document Verification & Compliance",
        "description": "Learn to verify visa documents, detect fraud, and ensure compliance standards.",
        "category": "compliance",
        "difficulty": "intermediate",
        "duration_hours": 6,
        "modules": 10,
        "certificate": True,
        "mandatory": True,
        "skills": ["document-verification", "fraud-detection", "compliance"],
    },
    {
        "id": "interview-101",
        "title": "Interview Preparation Coaching",
        "description": "Techniques for coaching visa applicants through embassy interviews successfully.",
        "category": "soft-skills",
        "difficulty": "intermediate",
        "duration_hours": 3,
        "modules": 6,
        "certificate": True,
        "mandatory": False,
        "skills": ["interview-coaching", "communication", "body-language"],
    },
    {
        "id": "ai-101",
        "title": "AI Tools for Immigration Services",
        "description": "Using AI document scanning, risk analysis, and chatbots in immigration workflows.",
        "category": "technology",
        "difficulty": "beginner",
        "duration_hours": 5,
        "modules": 8,
        "certificate": True,
        "mandatory": False,
        "skills": ["ai-documentation", "risk-analysis", "chatbot-ops"],
    },
    {
        "id": "data-privacy-101",
        "title": "Data Privacy & GDPR Compliance",
        "description": "Essential training on data protection regulations and client privacy practices.",
        "category": "compliance",
        "difficulty": "beginner",
        "duration_hours": 3,
        "modules": 5,
        "certificate": True,
        "mandatory": True,
        "skills": ["gdpr", "data-privacy", "client-confidentiality"],
    },
    {
        "id": "student-visa-101",
        "title": "Student Visa Specialist",
        "description": "Comprehensive training on F1, J1, and M1 student visa processes and university partnerships.",
        "category": "visa",
        "difficulty": "intermediate",
        "duration_hours": 6,
        "modules": 9,
        "certificate": True,
        "mandatory": False,
        "skills": ["f1-visa", "j1-visa", "sevis", "university-partnerships"],
    },
    {
        "id": "h1b-101",
        "title": "H1B & Work Visa Processing",
        "description": "End-to-end H1B, L1, and O1 work visa processing including LCA and prevailing wage.",
        "category": "visa",
        "difficulty": "advanced",
        "duration_hours": 10,
        "modules": 14,
        "certificate": True,
        "mandatory": False,
        "skills": ["h1b", "lca", "prevailing-wage", "l1", "o1"],
    },
    {
        "id": "customer-service-101",
        "title": "Client Communication Excellence",
        "description": "Best practices for client communication, expectation management, and service delivery.",
        "category": "soft-skills",
        "difficulty": "beginner",
        "duration_hours": 2,
        "modules": 4,
        "certificate": False,
        "mandatory": False,
        "skills": ["communication", "client-management", "service-excellence"],
    },
    {
        "id": "open-source-101",
        "title": "Open Source AI for Immigration",
        "description": "Leveraging open-source AI models (Ollama, Llama, Mistral) for immigration services.",
        "category": "technology",
        "difficulty": "intermediate",
        "duration_hours": 5,
        "modules": 7,
        "certificate": True,
        "mandatory": False,
        "skills": ["ollama", "chromadb", "rag", "embeddings", "llm-ops"],
    },
]


class EnrollRequest(BaseModel):
    course_id: str


class ProgressUpdate(BaseModel):
    course_id: str
    module_completed: int = 0
    progress_percent: float = 0.0
    notes: Optional[str] = None


@router.get("/catalog")
async def training_catalog(
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    mandatory_only: bool = False,
):
    results = list(TRAINING_CATALOG)
    if category:
        results = [c for c in results if c["category"] == category]
    if difficulty:
        results = [c for c in results if c["difficulty"] == difficulty]
    if mandatory_only:
        results = [c for c in results if c["mandatory"]]
    return {"ok": True, "total": len(results), "courses": results}


@router.post("/enroll")
async def training_enroll(req: EnrollRequest, user=Depends(get_current_user)):
    course = next((c for c in TRAINING_CATALOG if c["id"] == req.course_id), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    existing = await db["training_enrollments"].find_one({
        "user_id": user["_id"], "course_id": req.course_id,
    })
    if existing:
        return {"ok": True, "message": "Already enrolled", "enrollment": _serialize_enrollment(existing)}

    enrollment = {
        "_id": str(uuid.uuid4()),
        "user_id": user["_id"],
        "course_id": req.course_id,
        "course_title": course["title"],
        "status": "enrolled",
        "progress_percent": 0.0,
        "modules_completed": 0,
        "total_modules": course["modules"],
        "enrolled_at": datetime.utcnow(),
        "last_activity": datetime.utcnow(),
    }
    await db["training_enrollments"].insert_one(enrollment)
    return {"ok": True, "message": f"Enrolled in {course['title']}", "enrollment": _serialize_enrollment(enrollment)}


@router.get("/progress")
async def training_progress(user=Depends(get_current_user)):
    enrollments = await db["training_enrollments"].find({"user_id": user["_id"]}).to_list(50)
    return {
        "ok": True,
        "total_enrollments": len(enrollments),
        "completed": sum(1 for e in enrollments if e.get("status") == "completed"),
        "in_progress": sum(1 for e in enrollments if e.get("status") == "enrolled"),
        "enrollments": [_serialize_enrollment(e) for e in enrollments],
    }


@router.post("/progress/update")
async def training_progress_update(req: ProgressUpdate, user=Depends(get_current_user)):
    enrollment = await db["training_enrollments"].find_one({
        "user_id": user["_id"], "course_id": req.course_id,
    })
    if not enrollment:
        raise HTTPException(status_code=404, detail="Not enrolled in this course")

    course = next((c for c in TRAINING_CATALOG if c["id"] == req.course_id), None)
    total = course["modules"] if course else enrollment.get("total_modules", 10)

    modules_completed = max(enrollment.get("modules_completed", 0), req.module_completed)
    progress = min(100.0, max(0.0, (modules_completed / total) * 100))
    status = "completed" if progress >= 100 else "enrolled"

    await db["training_enrollments"].update_one(
        {"_id": enrollment["_id"]},
        {"$set": {
            "modules_completed": modules_completed,
            "progress_percent": round(progress, 1),
            "status": status,
            "last_activity": datetime.utcnow(),
            "notes": req.notes,
        }},
    )

    if status == "completed" and course and course.get("certificate"):
        await _ensure_certificate(user["_id"], req.course_id, course["title"])

    return {"ok": True, "progress": round(progress, 1), "status": status}


async def _ensure_certificate(user_id: str, course_id: str, course_title: str):
    existing = await db["training_certificates"].find_one({
        "user_id": user_id, "course_id": course_id,
    })
    if not existing:
        await db["training_certificates"].insert_one({
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "course_id": course_id,
            "course_title": course_title,
            "issued_at": datetime.utcnow(),
            "certificate_id": f"WH-CERT-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
        })


@router.get("/recommend")
async def training_recommend(user=Depends(get_current_user)):
    enrollments = await db["training_enrollments"].find({"user_id": user["_id"]}).to_list(50)
    completed = {e["course_id"] for e in enrollments if e.get("status") == "completed"}
    in_progress = {e["course_id"] for e in enrollments if e.get("status") == "enrolled"}

    mandatory_not_done = []
    skill_based = []
    for course in TRAINING_CATALOG:
        if course["id"] not in completed and course["id"] not in in_progress:
            if course["mandatory"]:
                mandatory_not_done.append(course)
            else:
                skill_based.append(course)

    recommendations = mandatory_not_done[:3] + skill_based[:3]

    return {
        "ok": True,
        "recommendations": recommendations,
        "mandatory_pending": len(mandatory_not_done),
        "completed_count": len(completed),
    }


@router.get("/certificates")
async def training_certificates(user=Depends(get_current_user)):
    certs = await db["training_certificates"].find({"user_id": user["_id"]}).to_list(50)
    return {
        "ok": True,
        "total": len(certs),
        "certificates": [
            {
                "id": c["certificate_id"],
                "course": c["course_title"],
                "issued": str(c["issued_at"]),
            }
            for c in certs
        ],
    }


@router.post("/certificates/generate")
async def training_certificate_generate(course_id: str, user=Depends(get_current_user)):
    enrollment = await db["training_enrollments"].find_one({
        "user_id": user["_id"], "course_id": course_id, "status": "completed",
    })
    if not enrollment:
        raise HTTPException(status_code=400, detail="Course not completed")

    course = next((c for c in TRAINING_CATALOG if c["id"] == course_id), None)
    title = course["title"] if course else enrollment.get("course_title", course_id)

    await _ensure_certificate(user["_id"], course_id, title)
    return {"ok": True, "message": "Certificate generated"}


@router.get("/mandatory")
async def training_mandatory(user=Depends(get_current_user)):
    mandatory_courses = [c for c in TRAINING_CATALOG if c["mandatory"]]
    enrollments = await db["training_enrollments"].find({"user_id": user["_id"]}).to_list(50)
    completed = {e["course_id"] for e in enrollments if e.get("status") == "completed"}
    in_progress = {e["course_id"] for e in enrollments if e.get("status") == "enrolled"}

    compliance = []
    for c in mandatory_courses:
        if c["id"] in completed:
            status = "completed"
        elif c["id"] in in_progress:
            status = "in_progress"
        else:
            status = "not_started"
        compliance.append({"course_id": c["id"], "title": c["title"], "status": status})

    done = sum(1 for item in compliance if item["status"] == "completed")
    total = len(compliance)

    return {
        "ok": True,
        "compliance_rate": f"{(done/total*100):.0f}%" if total > 0 else "N/A",
        "completed": done,
        "total": total,
        "courses": compliance,
    }


def _serialize_enrollment(enrollment: dict) -> dict:
    return {
        "course_id": enrollment.get("course_id", ""),
        "course_title": enrollment.get("course_title", ""),
        "status": enrollment.get("status", "enrolled"),
        "progress_percent": enrollment.get("progress_percent", 0),
        "modules_completed": enrollment.get("modules_completed", 0),
        "total_modules": enrollment.get("total_modules", 0),
        "enrolled_at": str(enrollment.get("enrolled_at", "")),
    }
