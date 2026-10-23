from fastapi import APIRouter, Depends, HTTPException
from rate_limit import RateLimit
from auth_utils import get_current_user
from ai_marketplace import marketplace
from pydantic import BaseModel
import logging

logger = logging.getLogger("wehive.routes_financials")
router = APIRouter(prefix="/financials", tags=["financials"])

class FinancialQuery(BaseModel):
    query: str
    context: str = ""

_insights_limiter = RateLimit(max_calls=15, window_seconds=600)

@router.post("/insights", dependencies=[Depends(_insights_limiter)])
async def get_financial_insights(req: FinancialQuery, user=Depends(get_current_user)):
    """Uses LLM to dynamically generate financial advice and insights."""
    prompt = f"User Question: {req.query}\nContext: {req.context}\nProvide actionable, brief financial advice for studying abroad."
    
    try:
        reply = await marketplace.chat(
            user_id="system_financials",
            system_prompt="You are an expert financial advisor for international students. Keep responses concise, supportive, and highly actionable. Use markdown.",
            user_prompt=prompt,
            max_tokens=600
        )
        return {"insight": reply}
    except Exception as e:
        logger.error(f"Failed to generate financial insights: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI insights")
