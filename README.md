# WeHive

Study-abroad and visa consultancy platform: a FastAPI + MongoDB backend, a React (CRA/craco)
web frontend, and a standalone mobile-style consultant prototype.

## Repository layout

| Path                 | What it is |
|----------------------|------------|
| `backend/`           | FastAPI app (`server.py`), route modules (`routes_*.py`), AI agents (`agents/`, `orchestrator/`), unit tests in `backend/tests/` |
| `frontend/`          | React web app (craco, Tailwind), Jest unit tests, Playwright E2E in `frontend/e2e/` |
| `mobile-consultant/` | Vite + Express mobile consultant prototype (see its README) |
| `playwright/`        | Cross-browser validation suite run against a deployed or local site |
| `scripts/verify.sh`  | Local pre-PR check: build, types, lint, tests, secret scan |
| `docs/`              | Patterns and ADR index |
| `.github/workflows/ci.yml` | CI: backend unit tests + frontend lint/types/tests/build |

## Backend

Requirements: **Python 3.12**, **MongoDB 6+** (local `mongod` or Atlas).

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env          # then edit: MONGO_URL, DB_NAME, JWT_SECRET at minimum
uvicorn server:app --reload --port 8000
```

`backend/server.py` loads `backend/.env`. `.env.example` (root, mirrored at
`backend/.env.example`) lists every variable the backend reads, grouped by feature. Required:
`MONGO_URL`, `JWT_SECRET` (long random string), `APP_ENV`. Everything else enables optional
integrations (SMTP/Postal, Twilio, Telegram, Razorpay, R2 storage, LLM providers, ...).

**Firebase Admin:** set `FIREBASE_PROJECT_ID` and `FIREBASE_CREDENTIALS` (the service-account
JSON as a single-line string). If unset, the backend falls back to the `settings.firebase`
document in MongoDB. Never commit `*firebase-adminsdk*.json` key files (they are gitignored).

## Frontend

Requirements: **Node 20**.

```bash
cd frontend
npm ci
cp .env.example .env             # REACT_APP_BACKEND_URL=http://localhost:8000, Firebase web config
npm start                        # http://localhost:3000
```

## Running tests

```bash
# Backend unit tests (need MongoDB reachable at MONGO_URL; DB/HTTP calls are mostly mocked)
cd backend && python -m pytest tests/test_unit_*.py -q

# Frontend
cd frontend && npx eslint src && npx tsc --noEmit && CI=true npx craco test --watchAll=false

# Playwright validation suite (defaults to http://localhost:3000; override with BASE_URL)
cd playwright && npm ci && npx playwright install && BASE_URL=http://localhost:3000 npm test
#   optional: E2E_TEST_PASSWORD (signup tests), E2E_AUTH_TOKEN (authenticated tests)

# Everything, plus a secret scan of all tracked files
scripts/verify.sh
```

Other files in `backend/tests/` (non-`test_unit_*`) are integration tests that call a running
deployment via `BASE_URL`; they are not run in CI.

## Deployment

- `backend/Dockerfile` runs `uvicorn server:app` on port 8000; `frontend/Dockerfile` builds the
  SPA (pass `REACT_APP_BACKEND_URL` as a build arg) and serves it with nginx.
- Provide secrets through the platform's environment (e.g. Dokploy app env), never via files
  in the repo.
- `ssh_deploy.py`, `sync_file.py`, `sync_frontend.py` are ad-hoc helpers for pushing files to
  the server over SSH. They read `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (preferred) or
  `DEPLOY_PASSWORD`, `DEPLOY_BACKEND_ROOT` / `DEPLOY_FRONTEND_ROOT` from the environment and
  require the host key to already be in `~/.ssh/known_hosts` (unknown hosts are rejected):

  ```bash
  ssh-keyscan -H "$DEPLOY_HOST" >> ~/.ssh/known_hosts   # verify the fingerprint first
  DEPLOY_HOST=... DEPLOY_USER=... DEPLOY_SSH_KEY=~/.ssh/id_ed25519 python ssh_deploy.py "docker ps"
  ```

See `SECURITY.md` for reporting vulnerabilities and `.github/CONTRIBUTING.md` for workflow.
