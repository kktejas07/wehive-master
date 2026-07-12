"""AI Operations — Consolidated endpoints for smart-search, briefing,
resume screening, performance reviews, and AI status monitoring.

Endpoints:
  POST /api/ai/smart-search              Natural language search
  GET  /api/ai/smart-search/schema       Search schema / indexed collections
  POST /api/ai/briefing                  AI-generated briefing
  POST /api/ai/resume-screening          Resume text screening
  POST /api/ai/resume-screening/upload   Resume file screening
  POST /api/ai/performance-review        Draft performance reviews
  GET  /api/ai/status                    AI system status
  GET  /api/ai/providers                 List all AI providers
  POST /api/ai/vision/ocr                OCR processing
  POST /api/ai/vision/classify           Document classification
  POST /api/ai/vision/parse-resume       Resume parsing via LLM
  POST /api/ai/speech/transcribe         Audio transcription
  POST /api/ai/translate                 Translation
"""

import base64
import os
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from core.auth_utils import get_current_user, get_current_user_optional

router = APIRouter(prefix="/ai", tags=["ai-operations"])

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")


class SmartSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    collections: Optional[list[str]] = None
    top_k: int = Field(5, ge=1, le=20)


class BriefingRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=500)
    format: str = Field("summary", pattern=r"^(summary|detailed|bullet|report)$")
    context: Optional[str] = None


class ResumeScreeningRequest(BaseModel):
    resume_text: str = Field(..., min_length=50, max_length=25000)
    job_description: Optional[str] = Field(None, max_length=5000)
    criteria: Optional[list[str]] = None


class PerformanceReviewRequest(BaseModel):
    employee_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(..., max_length=100)
    period: str = Field("quarterly", pattern=r"^(quarterly|annual|semi-annual)$")
    achievements: Optional[str] = None
    feedback: Optional[str] = None
    goals: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    source_lang: Optional[str] = "auto"
    target_lang: str = "en"


class NextStepsRequest(BaseModel):
    academicLevel: Optional[str] = "Master's Degree"
    dreamCountry: Optional[str] = "Germany"
    milestones: Optional[list] = []
    vaultDocs: Optional[list] = []


AI_SEARCH_SCHEMA = {
    "collections": [
        {"name": "countries_v2", "fields": ["name", "capital", "region", "visa_types", "notes"], "type": "visa"},
        {"name": "universities_v2", "fields": ["name", "country", "courses", "scholarships", "qs_rank"], "type": "education"},
        {"name": "applications", "fields": ["applicant_name", "country_name", "visa_type", "status"], "type": "application"},
        {"name": "usvisa_slots", "fields": ["consulate_name", "city", "visa_type", "date"], "type": "slots"},
        {"name": "chat_sessions", "fields": ["title"], "type": "chat"},
        {"name": "learning_resources", "fields": ["title", "description", "tags"], "type": "knowledge"},
    ],
    "filters_available": ["category", "type", "difficulty", "tag", "country", "status", "date_range"],
    "updated_at": datetime.utcnow().isoformat(),
}


@router.post("/smart-search")
async def smart_search(req: SmartSearchRequest, user=Depends(get_current_user_optional)):
    try:
        from ai_marketplace import marketplace

        system = (
            "You are an intelligent search engine for We Hive platform. "
            "Search across all available data: visa information, countries, universities, "
            "applications, slot availability, learning resources, and chat history. "
            "Return structured JSON with: "
            '{"results": [{"title":..., "snippet":..., "source":..., "relevance":..., "action":...}], '
            '"total": N, "suggestions": [...]}. Only return JSON, no other text.'
        )

        context = f"Searchable collections: {[c['name'] for c in AI_SEARCH_SCHEMA['collections']]}"

        messages = [
            {"role": "system", "content": f"{system}\n\n{context}"},
            {"role": "user", "content": f"Search for: {req.query}"},
        ]

        response = await marketplace.chat(messages=messages, max_tokens=1024)
        content = response.get("content", "{}") if isinstance(response, dict) else "{}"

        try:
            import json
            parsed = json.loads(content)
        except Exception:
            parsed = {"results": [{"title": "Search Result", "snippet": content, "source": "llm", "relevance": 0.9}], "total": 1}

        return {"ok": True, "query": req.query, **parsed}

    except Exception as e:
        return {"ok": False, "detail": str(e)}


@router.get("/smart-search/schema")
async def smart_search_schema():
    return {"ok": True, **AI_SEARCH_SCHEMA}


@router.post("/briefing")
async def ai_briefing(req: BriefingRequest, user=Depends(get_current_user)):
    try:
        from ai_marketplace import marketplace

        format_prompts = {
            "summary": "Provide a concise 2-3 paragraph summary.",
            "detailed": "Provide a comprehensive analysis with multiple sections.",
            "bullet": "Provide key points in bullet format.",
            "report": "Structure as a formal report with executive summary, findings, and recommendations.",
        }

        system = (
            "You are an executive briefing AI for We Hive. "
            f"{format_prompts.get(req.format, format_prompts['summary'])} "
            "Be factual, structured, and actionable."
        )
        if req.context:
            system += f"\n\nContext: {req.context}"

        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": f"Briefing topic: {req.topic}"},
        ]

        response = await marketplace.chat(messages=messages, max_tokens=2048)
        content = response.get("content", "") if isinstance(response, dict) else str(response)

        return {"ok": True, "topic": req.topic, "format": req.format, "briefing": content}

    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/resume-screening")
async def resume_screening(req: ResumeScreeningRequest, user=Depends(get_current_user)):
    try:
        from ai_marketplace import marketplace

        system = (
            "You are an expert resume screener. Analyze the resume against the job description "
            "and criteria. Return structured JSON with: "
            '{"match_score": 0-100, "strengths": [...], "weaknesses": [...], '
            '"skills_match": [...], "experience_summary": "...", "recommendation": "..."}. '
            "Only return JSON, no other text."
        )

        user_prompt = f"Resume:\n{req.resume_text[:5000]}"
        if req.job_description:
            user_prompt += f"\n\nJob Description:\n{req.job_description[:3000]}"
        if req.criteria:
            user_prompt += f"\n\nScreening Criteria: {', '.join(req.criteria)}"

        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt},
        ]

        response = await marketplace.chat(messages=messages, max_tokens=1024)
        content = response.get("content", "{}") if isinstance(response, dict) else "{}"

        try:
            import json
            result = json.loads(content)
        except Exception:
            result = {"match_score": 50, "recommendation": "Review manually", "error": "Could not parse response"}

        return {"ok": True, **result}

    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/resume-screening/upload")
async def resume_screening_upload(
    file: UploadFile = File(...),
    job_description: Optional[str] = Form(None),
):
    contents = await file.read()

    text = ""
    if file.filename and file.filename.endswith(".pdf"):
        try:
            import io
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(contents))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except ImportError:
            text = contents.decode("utf-8", errors="ignore")
    else:
        text = contents.decode("utf-8", errors="ignore")[:10000]

    if len(text) < 50:
        raise HTTPException(status_code=400, detail="Could not extract sufficient text from file")

    return await resume_screening(
        ResumeScreeningRequest(resume_text=text, job_description=job_description)
    )


@router.post("/performance-review")
async def performance_review(req: PerformanceReviewRequest, user=Depends(get_current_user)):
    try:
        from ai_marketplace import marketplace

        system = (
            "You are an HR AI assistant for We Hive. Draft a professional performance review. "
            "Return JSON: "
            '{"review": "...", "strengths": [...], "improvements": [...], '
            '"goals_assessment": "...", "overall_rating": "...", "next_steps": [...]}. '
            "Only return JSON."
        )

        user_prompt = (
            f"Employee: {req.employee_name}\nRole: {req.role}\nPeriod: {req.period}\n"
            f"Achievements: {req.achievements or 'Not provided'}\n"
            f"Feedback: {req.feedback or 'Not provided'}\n"
            f"Goals: {req.goals or 'Not provided'}\n"
            f"Self-rating: {req.rating or 'Not provided'}/5"
        )

        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt},
        ]

        response = await marketplace.chat(messages=messages, max_tokens=1500)
        content = response.get("content", "{}") if isinstance(response, dict) else "{}"

        try:
            import json
            result = json.loads(content)
        except Exception:
            result = {"review": content, "overall_rating": "N/A"}

        return {"ok": True, "employee": req.employee_name, **result}

    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/status")
async def ai_status():
    ollama_ok = False
    chroma_ok = False
    kg_ok = False

    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get("http://localhost:11434/api/tags")
            ollama_ok = resp.status_code == 200
    except Exception:
        pass

    try:
        from shared.vector_store import _client
        chroma_ok = _client is not None
    except Exception:
        pass

    if GOOGLE_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(
                    "https://kgsearch.googleapis.com/v1/entities:search",
                    params={"query": "test", "key": GOOGLE_API_KEY, "limit": 1},
                )
                kg_ok = resp.status_code == 200
        except Exception:
            pass

    marketplace_ok = False
    try:
        from ai_marketplace import marketplace, PROVIDER_REGISTRY
        marketplace_ok = marketplace is not None
        providers_count = len(PROVIDER_REGISTRY)
    except Exception:
        providers_count = 0

    return {
        "ok": True,
        "status": "healthy" if (ollama_ok or marketplace_ok) else "degraded",
        "providers_available": providers_count,
        "services": {
            "ollama": ollama_ok,
            "chromadb": chroma_ok,
            "google_knowledge_graph": kg_ok,
        },
        "marketplace_ready": marketplace_ok,
        "checked_at": datetime.utcnow().isoformat(),
    }


@router.get("/providers")
async def list_ai_providers():
    try:
        from ai_marketplace import PROVIDER_REGISTRY
        providers = [
            {
                "id": pid,
                "name": p["name"],
                "description": p["description"],
                "requires_key": p.get("requires_key", True),
                "pricing": p.get("pricing_tier", "unknown"),
                "category": p.get("category", "llm"),
                "models": p.get("models", []),
            }
            for pid, p in PROVIDER_REGISTRY.items()
        ]
        return {"ok": True, "total": len(providers), "providers": providers}
    except Exception as e:
        return {"ok": False, "detail": str(e)}


@router.post("/vision/ocr")
async def vision_ocr(
    file: UploadFile = File(...),
    language: Optional[str] = Form("en"),
):
    contents = await file.read()
    image_b64 = base64.b64encode(contents).decode("utf-8")

    try:
        from ai_marketplace import marketplace
        response = await marketplace.chat_with_image(
            system_prompt="Extract all text from this image. Return ONLY the extracted text, nothing else.",
            user_prompt=f"OCR this image. Language: {language}",
            image_b64=image_b64,
            mime=file.content_type or "image/png",
            max_tokens=1000,
        )
        text = response.get("content", "") if isinstance(response, dict) else str(response)
        return {"ok": True, "text": text, "file": file.filename}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/vision/classify")
async def vision_classify(
    file: UploadFile = File(...),
    labels: Optional[str] = Form(None),
):
    contents = await file.read()
    image_b64 = base64.b64encode(contents).decode("utf-8")

    label_list = [lb.strip() for lb in labels.split(",")] if labels else ["passport", "visa", "id_card", "bank_statement", "other"]

    try:
        from ai_marketplace import marketplace
        response = await marketplace.chat_with_image(
            system_prompt=(
                f"Classify this document image into one of: {', '.join(label_list)}. "
                "Return JSON: {\"classification\": \"...\", \"confidence\": 0-100, \"reasoning\": \"...\"}. "
                "Only return JSON."
            ),
            user_prompt=f"Classify this document. Options: {', '.join(label_list)}",
            image_b64=image_b64,
            mime=file.content_type or "image/png",
            max_tokens=300,
        )
        content = response.get("content", "{}") if isinstance(response, dict) else "{}"
        try:
            import json
            result = json.loads(content)
        except Exception:
            result = {"classification": "other", "confidence": 50}
        return {"ok": True, "file": file.filename, **result}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/vision/parse-resume")
async def vision_parse_resume(
    file: UploadFile = File(...),
):
    contents = await file.read()

    text = ""
    if file.filename and file.filename.endswith(".pdf"):
        try:
            import io
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(contents))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except ImportError:
            text = contents.decode("utf-8", errors="ignore")
    else:
        text = contents.decode("utf-8", errors="ignore")[:15000]

    if len(text) < 50:
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    try:
        from ai_marketplace import marketplace
        response = await marketplace.chat(
            messages=[
                {"role": "system", "content": (
                    "Parse this resume into structured JSON. Return: "
                    '{"name": "", "email": "", "phone": "", "skills": [...], '
                    '"experience": [{"company": "", "role": "", "duration": "", "highlights": [...]}], '
                    '"education": [{"degree": "", "institution": "", "year": ""}], '
                    '"total_years_experience": 0}. Only return JSON.'
                )},
                {"role": "user", "content": f"Resume text:\n{text[:8000]}"},
            ],
            max_tokens=1024,
        )
        content = response.get("content", "{}") if isinstance(response, dict) else "{}"
        try:
            import json
            result = json.loads(content)
        except Exception:
            result = {"name": "", "error": "Could not parse", "raw": content}
        return {"ok": True, **result}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/speech/transcribe")
async def speech_transcribe(
    file: UploadFile = File(...),
    language: Optional[str] = Form("en"),
):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="Set OPENAI_API_KEY for transcription")

    contents = await file.read()
    try:
        files = {"file": (file.filename or "audio.mp3", contents, file.content_type or "audio/mpeg")}
        data = {"model": "whisper-1", "language": language}
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                files=files,
                data=data,
            )
            if resp.status_code == 200:
                return {"ok": True, "text": resp.json().get("text", "")}
            raise HTTPException(status_code=502, detail=f"Transcription failed: {resp.text}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/translate")
async def translate(req: TranslateRequest):
    try:
        from ai_marketplace import marketplace
        response = await marketplace.chat(
            messages=[
                {"role": "system", "content": (
                    f"Translate from {req.source_lang} to {req.target_lang}. "
                    "Return only the translated text."
                )},
                {"role": "user", "content": req.text},
            ],
            temperature=0.3,
        )
        translated = response.get("content", "") if isinstance(response, dict) else ""
        return {"ok": True, "source": req.source_lang, "target": req.target_lang, "translated": translated}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/next-steps")
async def generate_next_steps(req: NextStepsRequest):
    try:
        from ai_marketplace import marketplace
        import json

        prompt = (
            "Analyze the study abroad preparation progress for the following student:\n"
            f"- Target Academic Level: {req.academicLevel}\n"
            f"- Target Dream Country: {req.dreamCountry}\n\n"
            "Current Milestones Progress:\n"
        )
        for m in req.milestones or []:
            status_text = "COMPLETED" if m.get("status") == "completed" else "PENDING"
            prompt += f"- [{status_text}] {m.get('title')}: {m.get('description')} ({m.get('category')})\n"
        
        prompt += "\nUploaded Documents in Vault:\n"
        for d in req.vaultDocs or []:
            prompt += f"- [{d.get('status')}] {d.get('name')} ({d.get('type')}) - {d.get('fileName')}\n"

        prompt += (
            "\nBased on their progress (e.g. which milestones are pending, which documents are missing or still under review, and their country specific requirements), suggest exactly 3-4 personalized next steps with a brief explanation and actionable advice. Categorize them and assign a priority level. Also include a short, encouraging AI Advisory note summarizing their overall preparation status.\n\n"
            "Format your response as a valid JSON object with the following schema:\n"
            "{\n"
            "  \"recommendations\": [\n"
            "    {\n"
            "      \"title\": \"Clear short title of task\",\n"
            "      \"description\": \"Detailed specific actionable advice\",\n"
            "      \"priority\": \"High\",\n"
            "      \"category\": \"Preparation\",\n"
            "      \"actionLabel\": \"Call-to-action button label\"\n"
            "    }\n"
            "  ],\n"
            "  \"advisoryNote\": \"A concise encouraging note (2-3 sentences)\"\n"
            "}"
        )

        response = await marketplace.chat(
            messages=[
                {"role": "system", "content": "You are WeHive's AI Next Steps Engine. You must return only a valid JSON object matching the requested schema. Do not write any markdown code blocks or explanations outside the JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
        )
        content = response.get("content", "") if isinstance(response, dict) else ""
        clean_content = content.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_content)
        return {"ok": True, **data}
    except Exception as e:
        return {
            "ok": True,
            "recommendations": [
                {
                    "title": "Complete Your Profile",
                    "description": "Please fill out your visa calculator parameters to receive customized next steps.",
                    "priority": "High",
                    "category": "Preparation",
                    "actionLabel": "Go to Profile"
                }
            ],
            "advisoryNote": "Get started by taking our 2-minute Visa Eligibility Calculator."
        }
