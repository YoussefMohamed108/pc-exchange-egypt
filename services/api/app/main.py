import os
import secrets
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from .evidence import router as evidence_router

app = FastAPI(title="PC Exchange Egypt Analysis API", version="0.1.0")
app.include_router(evidence_router)


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = "pc-exchange-analysis"
    pricing_available: bool = False


class EstimateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: Literal["gpu", "cpu", "ram", "storage", "motherboard", "psu", "other"]
    manufacturer: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=150)
    condition: Literal["A", "B", "C", "D"]
    age_months: int = Field(ge=0, le=240)
    warranty_months: int = Field(default=0, ge=0, le=60)


def require_service_token(authorization: Annotated[str | None, Header()] = None) -> None:
    token = os.getenv("PRICING_SERVICE_TOKEN", "")
    if len(token) < 32:
        raise HTTPException(status_code=503, detail={"code": "service_not_configured"})
    if not authorization or not secrets.compare_digest(authorization, f"Bearer {token}"):
        raise HTTPException(status_code=401, detail={"code": "unauthorized"})


@app.get("/v1/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@app.post("/v1/price-estimates", dependencies=[Depends(require_service_token)])
def estimate(request: EstimateRequest) -> None:
    # This contract intentionally refuses to invent observations or an estimate.
    raise HTTPException(status_code=503, detail={
        "code": "insufficient_market_data",
        "message": "Pricing is not available until an authorized observation dataset and statistical engine are implemented.",
    })
