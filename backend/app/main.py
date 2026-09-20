from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.config import API_PREFIX, SERVICE_NAME
from app.routes import cves, health, ml, summaries
from app.services.cve_service import DataSourceError

app = FastAPI(title=SERVICE_NAME, version="1.0.0")


@app.exception_handler(DataSourceError)
async def data_source_error_handler(request: Request, exc: DataSourceError):
    return JSONResponse(status_code=503, content={"detail": str(exc)})


app.include_router(health.router, prefix=API_PREFIX, tags=["health"])
app.include_router(cves.router, prefix=API_PREFIX, tags=["cves"])
app.include_router(summaries.router, prefix=API_PREFIX, tags=["summaries"])
app.include_router(ml.router, prefix=API_PREFIX, tags=["ml"])
