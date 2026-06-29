"""Generative AI Routes — Dedicated endpoints for text generation, image
generation, and content creation using the AI Marketplace provider chain.

Endpoints:
  POST /api/gen/text       — Generate text from prompt
  POST /api/gen/translate  — Translate text between languages
  POST /api/gen/summarize  — Summarize long text
  POST /api/gen/image      — Generate image from description (via DALL-E / Stable Diffusion)
  POST /api/gen/speech     — Text-to-speech conversion
  GET  /api/gen/models     — Available generation models and capabilities
"""

import base64
import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from auth_utils import get_current_user, get_current_user_optional
from db import db

router = APIRouter(prefix="/gen", tags=["gen-ai"])


class TextGenRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=8000)
    system_prompt: Optional[str] = None
    max_tokens: int = Field(1024, ge=1, le=4096)
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    model: Optional[str] = None
    style: Optional[str] = Field(None, description="creative, formal, concise, technical, friendly")


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    source_lang: Optional[str] = "auto"
    target_lang: str = Field("en", min_length=2, max_length=5)


class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=50, max_length=50000)
    max_length: int = Field(200, ge=50, le=1000)
    style: Optional[str] = "concise"


class ImageGenRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=1000)
    size: str = Field("1024x1024", pattern=r"^\d+x\d+$")
    style: Optional[str] = None
    num_images: int = Field(1, ge=1, le=4)


class SpeechRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4096)
    voice: str = "alloy"
    speed: float = Field(1.0, ge=0.25, le=4.0)


def _get_llm():
    try:
        from ai_marketplace import marketplace
        return marketplace
    except Exception:
        try:
            from local_llm import local_chat
            return local_chat
        except Exception:
            return None


STYLE_PROMPTS = {
    "creative": "Be imaginative, use vivid language, and think outside the box.",
    "formal": "Use formal, professional language. Maintain a polished and respectful tone.",
    "concise": "Be brief and direct. Remove all unnecessary words.",
    "technical": "Use precise technical language and include relevant details.",
    "friendly": "Use warm, conversational language. Be approachable and helpful.",
}

GEN_MODELS = [
    {"id": "default", "name": "Platform Default", "type": "text", "provider": "auto"},
    {"id": "gpt-4o", "name": "GPT-4o", "type": "text", "provider": "openai"},
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "type": "text", "provider": "openai"},
    {"id": "claude-3.5-sonnet", "name": "Claude 3.5 Sonnet", "type": "text", "provider": "anthropic"},
    {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash", "type": "text", "provider": "google"},
    {"id": "llama-3.2-70b", "name": "Llama 3.2 70B", "type": "text", "provider": "openrouter"},
    {"id": "deepseek-chat", "name": "DeepSeek Chat", "type": "text", "provider": "deepseek"},
    {"id": "dall-e-3", "name": "DALL-E 3", "type": "image", "provider": "openai"},
    {"id": "stable-diffusion-xl", "name": "Stable Diffusion XL", "type": "image", "provider": "stability"},
    {"id": "tts-1", "name": "OpenAI TTS", "type": "speech", "provider": "openai"},
]


@router.post("/text")
async def generate_text(
    req: TextGenRequest,
    user=Depends(get_current_user_optional),
):
    llm = _get_llm()
    if not llm:
        raise HTTPException(status_code=503, detail="No LLM provider available")

    system_prompt = req.system_prompt or "You are a helpful AI assistant."
    if req.style and req.style in STYLE_PROMPTS:
        system_prompt += f"\n\nStyle: {STYLE_PROMPTS[req.style]}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": req.prompt},
    ]

    try:
        if hasattr(llm, "chat"):
            response = await llm.chat(
                messages=messages,
                model=req.model,
                max_tokens=req.max_tokens,
                temperature=req.temperature,
            )
        else:
            response = {"content": llm(req.prompt) if callable(llm) else "LLM unavailable"}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Generation failed: {str(e)}")

    content = response.get("content", "") if isinstance(response, dict) else str(response)

    if user and user.get("_id"):
        await db["gen_logs"].insert_one({
            "user_id": user["_id"],
            "type": "text",
            "prompt": req.prompt[:200],
            "style": req.style,
            "model": req.model,
            "created_at": datetime.utcnow(),
        })

    return {
        "ok": True,
        "content": content,
        "model": req.model or "default",
        "usage": response.get("usage", {}) if isinstance(response, dict) else {},
    }


@router.post("/translate")
async def translate_text(
    req: TranslateRequest,
    user=Depends(get_current_user_optional),
):
    llm = _get_llm()
    if not llm:
        raise HTTPException(status_code=503, detail="No LLM provider available")

    system = (
        f"You are a professional translator. Translate the following text "
        f"from {req.source_lang} to {req.target_lang}. "
        f"Return ONLY the translated text, nothing else. "
        f"Preserve all formatting, line breaks, and special characters."
    )

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": req.text},
    ]

    try:
        if hasattr(llm, "chat"):
            response = await llm.chat(messages=messages, max_tokens=len(req.text) * 2, temperature=0.3)
        else:
            response = {"content": req.text}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Translation failed: {str(e)}")

    translated = response.get("content", "") if isinstance(response, dict) else str(response)

    return {
        "ok": True,
        "source_lang": req.source_lang,
        "target_lang": req.target_lang,
        "original": req.text[:200],
        "translated": translated,
    }


@router.post("/summarize")
async def summarize_text(
    req: SummarizeRequest,
    user=Depends(get_current_user_optional),
):
    llm = _get_llm()
    if not llm:
        raise HTTPException(status_code=503, detail="No LLM provider available")

    style_map = {"concise": "concise", "detailed": "detailed", "bullet": "bullet points", "eli5": "explain like I'm 5"}
    style = style_map.get(req.style, "concise")

    system = (
        f"You are a summarization expert. Summarize the following text in a {style} manner. "
        f"Keep the summary under {req.max_length} words. "
        f"Return ONLY the summary, nothing else."
    )

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": req.text},
    ]

    try:
        if hasattr(llm, "chat"):
            response = await llm.chat(messages=messages, max_tokens=min(req.max_length * 2, 1024), temperature=0.3)
        else:
            response = {"content": req.text[:req.max_length]}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Summarization failed: {str(e)}")

    summary = response.get("content", "") if isinstance(response, dict) else str(response)

    return {
        "ok": True,
        "original_length": len(req.text),
        "summary_length": len(summary),
        "summary": summary,
    }


@router.post("/image")
async def generate_image(
    req: ImageGenRequest,
    user=Depends(get_current_user),
):
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    stability_key = os.environ.get("STABILITY_API_KEY", "")

    if not openai_key and not stability_key:
        raise HTTPException(
            status_code=503,
            detail="No image generation provider configured. Set OPENAI_API_KEY or STABILITY_API_KEY.",
        )

    images = []

    if openai_key:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/images/generations",
                    headers={
                        "Authorization": f"Bearer {openai_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "dall-e-3",
                        "prompt": req.prompt,
                        "n": req.num_images,
                        "size": req.size,
                        "response_format": "b64_json",
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data.get("data", []):
                        images.append({
                            "provider": "openai",
                            "model": "dall-e-3",
                            "data": item.get("b64_json", ""),
                            "revised_prompt": item.get("revised_prompt", req.prompt),
                        })
        except Exception as e:
            logger = __import__("logging").getLogger("wehive.gen_ai")
            logger.warning("OpenAI image gen failed: %s", e)

    return {
        "ok": True,
        "images": images,
        "count": len(images),
    }


@router.post("/speech")
async def generate_speech(
    req: SpeechRequest,
    user=Depends(get_current_user),
):
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if not openai_key:
        raise HTTPException(status_code=503, detail="Set OPENAI_API_KEY for text-to-speech")

    try:
        import httpx
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.openai.com/v1/audio/speech",
                headers={"Authorization": f"Bearer {openai_key}"},
                json={
                    "model": "tts-1",
                    "input": req.text,
                    "voice": req.voice,
                    "speed": req.speed,
                    "response_format": "mp3",
                },
            )
            if resp.status_code == 200:
                audio_b64 = base64.b64encode(resp.content).decode("utf-8")
                return {
                    "ok": True,
                    "audio_base64": audio_b64,
                    "format": "mp3",
                    "voice": req.voice,
                }
            raise HTTPException(status_code=502, detail=f"TTS failed: {resp.text}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Speech generation failed: {str(e)}")


@router.get("/models")
async def list_gen_models():
    return {"ok": True, "models": GEN_MODELS, "capabilities": ["text", "image", "speech", "translate", "summarize"]}
