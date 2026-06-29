"""n8n Workflow Automation — Trigger and manage n8n workflows.

Endpoints:
  GET  /api/n8n/workflows        List configured n8n workflows
  POST /api/n8n/workflows/trigger  Trigger a workflow webhook
  GET  /api/n8n/status           n8n instance health check
  GET  /api/n8n/templates        Visa-process workflow templates

Integrates with self-hosted n8n instance via webhooks and REST API.
"""

import os
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_utils import get_current_user

router = APIRouter(prefix="/n8n", tags=["n8n-automation"])

N8N_BASE_URL = os.environ.get("N8N_BASE_URL", "http://localhost:5678")
N8N_API_KEY = os.environ.get("N8N_API_KEY", "")

VISA_WORKFLOW_TEMPLATES = [
    {
        "id": "visa-application-pipeline",
        "name": "Visa Application Pipeline",
        "description": "End-to-end automation: passport scan → document verification → fee calculation → application submission → status tracking → WhatsApp notification",
        "steps": 6,
        "triggers": ["new_application", "document_upload"],
        "category": "visa",
    },
    {
        "id": "passport-ocr-flow",
        "name": "Passport OCR + Auto-Fill",
        "description": "Upload passport image → OCR extraction (PassportEye/LlamaParse) → auto-populate DS-160 fields → save to application",
        "steps": 4,
        "triggers": ["passport_upload"],
        "category": "documents",
    },
    {
        "id": "slot-alert-pipeline",
        "name": "Slot Alert Pipeline",
        "description": "Slot detected → check subscriptions → send Telegram alert → send WhatsApp notification → log to dashboard",
        "steps": 5,
        "triggers": ["slot_detected"],
        "category": "slots",
    },
    {
        "id": "document-verification-flow",
        "name": "Document Verification Flow",
        "description": "Document uploaded → AI scan → validation check → flag issues → notify user → request re-upload if needed",
        "steps": 6,
        "triggers": ["document_upload"],
        "category": "documents",
    },
    {
        "id": "application-status-sync",
        "name": "Application Status Sync",
        "description": "Poll application status → update MongoDB → send status change notification → trigger agent alerts",
        "steps": 4,
        "triggers": ["schedule_15min", "status_change"],
        "category": "applications",
    },
    {
        "id": "weekly-report-generator",
        "name": "Weekly Report Generator",
        "description": "Generate weekly analytics → PDF report → email to admin → store in archives",
        "steps": 4,
        "triggers": ["schedule_weekly"],
        "category": "reports",
    },
    {
        "id": "university-application-orchestrator",
        "name": "University Application Orchestrator",
        "description": "Student applies → check requirements → AI SOP generation → document collection → submission tracking",
        "steps": 5,
        "triggers": ["new_university_application"],
        "category": "education",
    },
]


class TriggerWorkflowRequest(BaseModel):
    workflow_id: str
    payload: dict = {}


@router.get("/workflows")
async def list_workflows():
    return {
        "ok": True,
        "n8n_url": N8N_BASE_URL,
        "configured": bool(N8N_API_KEY),
        "templates": VISA_WORKFLOW_TEMPLATES,
    }


@router.post("/workflows/trigger")
async def trigger_workflow(req: TriggerWorkflowRequest, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    template = next((t for t in VISA_WORKFLOW_TEMPLATES if t["id"] == req.workflow_id), None)
    if not template:
        raise HTTPException(status_code=404, detail="Workflow template not found")

    if not N8N_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="n8n not configured — set N8N_BASE_URL and N8N_API_KEY in .env",
        )

    try:
        payload = {"template_id": req.workflow_id, "template_name": template["name"], **req.payload}
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{N8N_BASE_URL}/webhook/{req.workflow_id}",
                json=payload,
                headers={"X-N8N-API-KEY": N8N_API_KEY},
            )
            return {
                "ok": True,
                "workflow": req.workflow_id,
                "status_code": resp.status_code,
                "response": resp.text[:500],
                "triggered_at": datetime.utcnow().isoformat(),
            }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"n8n trigger failed: {str(e)}")


@router.get("/status")
async def n8n_status():
    healthy = False

    if N8N_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(
                    f"{N8N_BASE_URL}/healthz",
                    headers={"X-N8N-API-KEY": N8N_API_KEY},
                )
                healthy = resp.status_code == 200
        except Exception:
            pass

    return {
        "ok": True,
        "n8n_url": N8N_BASE_URL,
        "configured": bool(N8N_API_KEY),
        "healthy": healthy,
        "templates_available": len(VISA_WORKFLOW_TEMPLATES),
        "checked_at": datetime.utcnow().isoformat(),
    }


@router.get("/templates")
async def list_templates():
    return {"ok": True, "templates": VISA_WORKFLOW_TEMPLATES}
