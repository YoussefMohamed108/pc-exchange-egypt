import asyncio
import os
import subprocess
import sys
import tempfile
from collections import defaultdict, deque
from pathlib import Path
from time import monotonic
from uuid import UUID, uuid4

import httpx
from fastapi import APIRouter, HTTPException, Request

router = APIRouter()
slots = asyncio.Semaphore(2)
attempts: dict[str, deque] = defaultdict(deque)
MAX_INPUT = 3 * 1024 * 1024


def process_pdf(data: bytes) -> tuple[bytes, int]:
    with tempfile.TemporaryDirectory(prefix="pcx-evidence-") as folder:
        source, destination = Path(folder) / "input.pdf", Path(folder) / "output.pdf"
        source.write_bytes(data)
        # The renderer receives no database/API credentials in its environment.
        env = {k: os.environ[k] for k in ("PATH", "SYSTEMROOT", "LANG") if k in os.environ}
        result = subprocess.run([sys.executable, "-m", "app.pdf_worker", str(source), str(destination)],
                                capture_output=True, timeout=25, env=env, check=False)
        if result.returncode != 0 or not destination.exists():
            raise ValueError("PDF processing failed")
        return destination.read_bytes(), int(result.stdout.strip())


@router.post("/evidence/v1/submit/{listing_id}")
async def submit(listing_id: UUID, request: Request, revision: int):
    token = request.headers.get("authorization", "")
    if not token.startswith("Bearer ") or len(token) > 8192:
        raise HTTPException(401, "Sign in required")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not key:
        raise HTTPException(503, "Evidence service unavailable")
    if request.headers.get("content-type", "").split(";")[0] != "application/pdf":
        raise HTTPException(415, "Use a PDF")
    async with httpx.AsyncClient(timeout=15) as client:
        identity = await client.get("http://auth:9999/user", headers={"Authorization": token})
        if identity.status_code != 200 or not identity.json().get("email_confirmed_at"):
            raise HTTPException(401, "Confirmed account required")
        uid = str(UUID(identity.json()["id"]))
        now = monotonic()
        recent = attempts[uid]
        while recent and recent[0] < now - 600:
            recent.popleft()
        if len(recent) >= 10:
            raise HTTPException(429, "Please try later")
        recent.append(now)
        if len(attempts) > 5000:
            for old_uid in list(attempts):
                if not attempts[old_uid] or attempts[old_uid][-1] < now - 600:
                    del attempts[old_uid]
        owned = await client.get("http://rest:3000/marketplace_listings", headers={"Authorization": token},
                                 params={"id": f"eq.{listing_id}", "seller_id": f"eq.{uid}", "status": "eq.listed", "hidden": "eq.false", "select": "revision"})
        if owned.status_code != 200 or not owned.json() or owned.json()[0]["revision"] != revision:
            raise HTTPException(403, "Published listing ownership and current revision required")
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > MAX_INPUT:
                raise HTTPException(413, "Maximum PDF size is 3 MB")
        try:
            await asyncio.wait_for(slots.acquire(), timeout=1)
        except TimeoutError:
            raise HTTPException(429, "Evidence processing is busy")
        try:
            processed, pages = await asyncio.to_thread(process_pdf, bytes(body))
        except (ValueError, subprocess.TimeoutExpired):
            raise HTTPException(422, "Use an unlocked PDF with 1–12 ordinary pages")
        finally:
            slots.release()
        path = f"benchmarks/{uid}/{listing_id}/{uuid4()}.pdf"
        privileged = {"Authorization": f"Bearer {key}", "apikey": key}
        uploaded = await client.post(f"http://storage:5000/object/benchmark-evidence/{path}", headers={**privileged, "Content-Type": "application/pdf", "x-upsert": "false"}, content=processed)
        if uploaded.status_code not in (200, 201):
            raise HTTPException(503, "Evidence storage unavailable")
        committed = await client.post("http://rest:3000/rpc/submit_benchmark", headers=privileged,
                                      json={"uid": uid, "lid": str(listing_id), "expected_revision": revision, "object_path": path, "page_count": pages})
        if committed.status_code >= 300:
            await client.request("DELETE", "http://storage:5000/object/benchmark-evidence", headers=privileged, json={"prefixes": [path]})
            raise HTTPException(409, "Listing changed or submission limit reached")
        return {"id": committed.json(), "pages": pages}
