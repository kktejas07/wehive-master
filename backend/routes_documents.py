"""Multi-file drag-and-drop upload endpoint."""

from __future__ import annotations

import os
import uuid
from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_FILES = 15
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload-multi")
async def upload_multi(files: List[UploadFile] = File(...)):
    if len(files) > MAX_FILES:
        raise HTTPException(400, f"Max {MAX_FILES} files allowed")

    results = []
    for f in files:
        if f.content_type not in ALLOWED_TYPES:
            results.append({"name": f.filename, "status": "rejected", "reason": "type"})
            continue
        data = await f.read()
        if len(data) > MAX_SIZE:
            results.append({"name": f.filename, "status": "rejected", "reason": "size"})
            continue
        fid = str(uuid.uuid4())
        os.makedirs("/tmp/uploads", exist_ok=True)
        with open(f"/tmp/uploads/{fid}_{f.filename}", "wb") as fh:
            fh.write(data)
        results.append({"name": f.filename, "status": "ok", "file_id": fid})

    return {"uploaded": results}
