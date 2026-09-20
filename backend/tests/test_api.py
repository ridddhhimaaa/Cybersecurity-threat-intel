import asyncio

import httpx

from app.main import app


def request(path: str) -> httpx.Response:
    async def send():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.get(path)

    return asyncio.run(send())


def test_core_endpoints_and_docs():
    assert request("/api/health").status_code == 200
    assert request("/docs").status_code == 200
    assert request("/api/cves").json()["count"] > 0
    assert request("/api/summary/severity").status_code == 200
    assert request("/api/summary/cwe").status_code == 200
    assert request("/api/summary/trends").status_code == 200
    assert request("/api/ml/clusters").status_code == 200


def test_cve_filters_pagination_and_lookup():
    response = request("/api/cves?severity=high&min_cvss=9&limit=1&offset=0")
    body = response.json()
    assert response.status_code == 200
    assert body["count"] == 1
    assert body["limit"] == 1
    assert body["data"][0]["severity"] == "HIGH"

    cve_id = body["data"][0]["cve_id"]
    assert request(f"/api/cves/{cve_id}").status_code == 200
    assert request("/api/cves/CVE-DOES-NOT-EXIST").status_code == 404


def test_invalid_limit_is_rejected():
    assert request("/api/cves?limit=0").status_code == 422
