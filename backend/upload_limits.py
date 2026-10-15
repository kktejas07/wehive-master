from fastapi import HTTPException, UploadFile


async def read_capped(file: UploadFile, max_mb: int = 10) -> bytes:
    """Read an upload, rejecting anything over max_mb instead of buffering it whole."""
    limit = max_mb * 1024 * 1024
    content = await file.read(limit + 1)
    if len(content) > limit:
        raise HTTPException(413, f'File exceeds {max_mb}MB limit')
    return content
