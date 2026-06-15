import json
import os
import logging
from fastapi import HTTPException

logger = logging.getLogger('wehive.firebase')

_firebase_app = None


async def _get_firebase_creds():
    project_id = os.environ.get('FIREBASE_PROJECT_ID', '')
    creds_json = os.environ.get('FIREBASE_CREDENTIALS', '')

    if not project_id or not creds_json:
        from db import db
        doc = await db['settings'].find_one({'_id': 'firebase'}) or {}
        cfg = doc.get('config', {})
        if not project_id:
            project_id = cfg.get('projectId', '')
        if not creds_json:
            creds_json = cfg.get('service_account_key', '')

    return project_id, creds_json


def init_firebase_admin(project_id: str, creds_json: str):
    global _firebase_app
    import firebase_admin
    from firebase_admin import credentials

    try:
        cred_dict = json.loads(creds_json)
        cred = credentials.Certificate(cred_dict)
        _firebase_app = firebase_admin.initialize_app(cred, {'projectId': project_id})
        logger.info('Firebase Admin SDK initialized')
        return _firebase_app
    except Exception as e:
        logger.exception('Failed to initialize Firebase Admin SDK')
        raise HTTPException(status_code=503, detail=f'Firebase init failed: {str(e)}')


def get_firebase_app():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app
    raise HTTPException(status_code=503, detail='Firebase not initialized — call init_firebase_admin first')


async def verify_firebase_token(id_token: str) -> dict:
    app = get_firebase_app()
    from firebase_admin import auth
    try:
        decoded = auth.verify_id_token(id_token)
        return decoded
    except Exception as e:
        raise HTTPException(status_code=401, detail=f'Invalid Firebase token: {str(e)}')
