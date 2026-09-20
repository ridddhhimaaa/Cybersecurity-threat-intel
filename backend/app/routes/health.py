from fastapi import APIRouter

from app.config import SERVICE_NAME

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy", "service": SERVICE_NAME}
