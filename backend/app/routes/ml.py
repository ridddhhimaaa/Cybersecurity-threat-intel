from fastapi import APIRouter, HTTPException

from app.models.schemas import DataListResponse
from app.services.cve_service import DataSourceError
from app.services.ml_service import get_ml_output

router = APIRouter(prefix="/ml")


def _ml_output(name: str) -> DataListResponse:
    try:
        data = get_ml_output(name)
        return DataListResponse(data=data, count=len(data))
    except DataSourceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/features", response_model=DataListResponse)
def features(): return _ml_output("cve_ml_features")


@router.get("/clusters", response_model=DataListResponse)
def clusters(): return _ml_output("cluster_summary")
