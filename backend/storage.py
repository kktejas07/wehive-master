"""Cloudflare R2 (S3-compatible) storage helpers.

We store user-uploaded application documents and AI scan artefacts in R2
using a presigned-URL pattern. Objects are PRIVATE — we only ever return
short-lived signed GET URLs to the owner.

Object key convention:
    documents/{user_id}/{application_id}/{doc_id}/{safe_filename}
    scans/{user_id}/{scan_id}/{safe_filename}

Environment variables (set in /app/backend/.env):
    R2_BUCKET, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
    R2_ENDPOINT, R2_PUBLIC_URL, R2_SIGNED_URL_TTL
"""
from __future__ import annotations

import os
import logging
import threading
from typing import Optional

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException

logger = logging.getLogger('wehive.storage')

R2_BUCKET = os.environ.get('R2_BUCKET', '')
R2_ENDPOINT = os.environ.get('R2_ENDPOINT', '')
R2_ACCESS_KEY = os.environ.get('R2_ACCESS_KEY_ID', '')
R2_SECRET_KEY = os.environ.get('R2_SECRET_ACCESS_KEY', '')
R2_PUBLIC_URL = (os.environ.get('R2_PUBLIC_URL', '') or '').rstrip('/')
R2_SIGNED_URL_TTL = int(os.environ.get('R2_SIGNED_URL_TTL', '3600'))

_client = None
_lock = threading.Lock()


def is_configured() -> bool:
    return bool(R2_BUCKET and R2_ENDPOINT and R2_ACCESS_KEY and R2_SECRET_KEY)


def _get_client():
    global _client
    if _client is not None:
        return _client
    with _lock:
        if _client is None:
            if not is_configured():
                raise HTTPException(503, 'Cloud storage is not configured. Contact admin.')
            _client = boto3.client(
                's3',
                endpoint_url=R2_ENDPOINT,
                aws_access_key_id=R2_ACCESS_KEY,
                aws_secret_access_key=R2_SECRET_KEY,
                region_name='auto',
                config=Config(signature_version='s3v4', retries={'max_attempts': 3}),
            )
    return _client


# ---------- key helpers ----------
def doc_key(user_id: str, application_id: str, doc_id: str, filename: str) -> str:
    safe = (filename or 'file').replace('/', '_').replace('\\', '_')[:120]
    return f'documents/{user_id}/{application_id}/{doc_id}/{safe}'


def scan_key(user_id: str, scan_id: str, filename: str) -> str:
    safe = (filename or 'scan').replace('/', '_').replace('\\', '_')[:120]
    return f'scans/{user_id}/{scan_id}/{safe}'


# ---------- core operations ----------
def upload_bytes(key: str, content: bytes, content_type: str = 'application/octet-stream') -> dict:
    client = _get_client()
    try:
        client.put_object(
            Bucket=R2_BUCKET,
            Key=key,
            Body=content,
            ContentType=content_type,
            ServerSideEncryption='AES256',
        )
    except (BotoCoreError, ClientError) as e:
        logger.exception('R2 upload failed for %s: %s', key, e)
        raise HTTPException(502, 'Cloud upload failed. Please try again.')
    return {
        'storage': 'r2',
        'bucket': R2_BUCKET,
        'key': key,
        'size': len(content),
        'content_type': content_type,
    }


def signed_download_url(key: str, ttl: Optional[int] = None, filename: Optional[str] = None) -> str:
    client = _get_client()
    params = {'Bucket': R2_BUCKET, 'Key': key}
    if filename:
        params['ResponseContentDisposition'] = f'attachment; filename="{filename}"'
    try:
        return client.generate_presigned_url(
            'get_object',
            Params=params,
            ExpiresIn=int(ttl or R2_SIGNED_URL_TTL),
        )
    except (BotoCoreError, ClientError) as e:
        logger.exception('R2 presign failed for %s: %s', key, e)
        raise HTTPException(502, 'Could not generate download link.')


def delete_object(key: str) -> bool:
    client = _get_client()
    try:
        client.delete_object(Bucket=R2_BUCKET, Key=key)
        return True
    except (BotoCoreError, ClientError) as e:
        logger.warning('R2 delete failed for %s: %s', key, e)
        return False
