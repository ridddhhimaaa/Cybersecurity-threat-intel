from fastapi import APIRouter, HTTPException

from app.models.schemas import DataListResponse
from app.services.analytics_service import get_summary
from app.services.cve_service import DataSourceError

router = APIRouter(prefix="/summary")


def _summary(name: str) -> DataListResponse:
    try:
        data = get_summary(name)
        return DataListResponse(data=data, count=len(data))
    except DataSourceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/severity", response_model=DataListResponse)
def severity(): return _summary("severity_summary")


@router.get("/cvss", response_model=DataListResponse)
def cvss(): return _summary("cvss_summary")


@router.get("/trends", response_model=DataListResponse)
def trends(): return _summary("yearly_trends")


@router.get("/attack-vectors", response_model=DataListResponse)
def attack_vectors(): return _summary("attack_vector_summary")


@router.get("/attack-complexity", response_model=DataListResponse)
def attack_complexity(): return _summary("attack_complexity_summary")


@router.get("/privileges", response_model=DataListResponse)
def privileges(): return _summary("privileges_summary")


@router.get("/user-interaction", response_model=DataListResponse)
def user_interaction(): return _summary("user_interaction_summary")


@router.get("/scope", response_model=DataListResponse)
def scope(): return _summary("scope_summary")


@router.get("/cwe", response_model=DataListResponse)
def cwe(): return _summary("cwe_analytics")


@router.get("/top-vulnerabilities", response_model=DataListResponse)
def top_vulnerabilities(): return _summary("top_vulnerabilities")
