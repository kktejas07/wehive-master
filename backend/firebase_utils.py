import json
import os
import logging
from fastapi import HTTPException

logger = logging.getLogger('wehive.firebase')

_firebase_app = None


def get_firebase_app():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    import firebase_admin
    from firebase_admin import credentials

    project_id = os.environ.get('FIREBASE_PROJECT_ID', '')
    creds_json = os.environ.get('FIREBASE_CREDENTIALS', '')

    if not project_id:
        raise HTTPException(status_code=503, detail='Firebase not configured (FIREBASE_PROJECT_ID missing)')

    if not creds_json:
        raise HTTPException(status_code=503, detail='Firebase credentials not configured (FIREBASE_CREDENTIALS missing)')

    try:
        cred_dict = json.loads(creds_json)
        cred = credentials.Certificate(cred_dict)
        _firebase_app = firebase_admin.initialize_app(cred, {'projectId': project_id})
        logger.info('Firebase Admin SDK initialized')
        return _firebase_app
    except Exception as e:
        logger.exception('Failed to initialize Firebase Admin SDK')
        raise HTTPException(status_code=503, detail=f'Firebase init failed: {str(e)}')


async def verify_firebase_token(id_token: str) -> dict:
    app = get_firebase_app()
    from firebase_admin import auth
    try:
        decoded = auth.verify_id_token(id_token)
        return decoded
    except Exception as e:
        raise HTTPException(status_code=401, detail=f'Invalid Firebase token: {str(e)}')
