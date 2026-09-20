from fastapi import APIRouter, HTTPException, Query

from app.config import DEFAULT_LIMIT, MAX_LIMIT
from app.models.schemas import CVEListResponse, CVERecord
from app.services.cve_service import DataSourceError, get_cve, list_cves

router = APIRouter()


@router.get("/cves", response_model=CVEListResponse)
def cves(
    severity: str | None = None,
    min_cvss: float | None = Query(default=None, ge=0, le=10),
    max_cvss: float | None = Query(default=None, ge=0, le=10),
    attack_vector: str | None = None,
    cwe_id: str | None = None,
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
) -> CVEListResponse:
    if min_cvss is not None and max_cvss is not None and min_cvss > max_cvss:
        raise HTTPException(status_code=422, detail="min_cvss cannot exceed max_cvss")
    try:
        data, _ = list_cves(
            {"severity": severity, "min_cvss": min_cvss, "max_cvss": max_cvss,
             "attack_vector": attack_vector, "cwe_id": cwe_id},
            limit,
            offset,
        )
        return CVEListResponse(data=data, count=len(data), limit=limit, offset=offset)
    except DataSourceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/cves/{cve_id}", response_model=CVERecord)
def cve(cve_id: str) -> dict:
    try:
        record = get_cve(cve_id)
    except DataSourceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if record is None:
        raise HTTPException(status_code=404, detail=f"CVE not found: {cve_id}")
    return record
