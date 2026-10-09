# Contributing to We Hive

## Development Setup

1. **Backend** (Python 3.12): `cd backend && python3.12 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
2. **Frontend** (Node 20): `cd frontend && npm ci`
3. **Environment**: copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to
   `frontend/.env`, then fill in values. See the root `README.md` for details.

## Continuous Integration

`.github/workflows/ci.yml` runs on every push and pull request:

- **backend** -- Python 3.12, `pip install -r backend/requirements.txt`, then
  `pytest tests/test_unit_*.py -q` (from `backend/`) against a MongoDB 7 service container.
  Integration tests that hit a live deployment are *not* run in CI.
- **frontend** -- Node 20, `npm ci`, `eslint src`, `tsc --noEmit`,
  `craco test --watchAll=false`, and a production `npm run build`.

CI does not currently run mypy, flake8, Playwright E2E, or the mobile-consultant app.

## Before Submitting

Run `scripts/verify.sh` locally. It is a superset of CI and checks:
- Build (frontend + backend syntax)
- Type check (TS + mypy)
- Lint (ESLint + flake8)
- Tests (pytest unit tests)
- Security scan (private keys / hard-coded passwords in all tracked files, npm audit)
- Diff review

## Commit Conventions

- `feat:` — New feature
- `fix:` — Bug fix
- `style:` — UI/style changes
- `refactor:` — Code restructuring
- `test:` — Test additions/changes
- `docs:` — Documentation
- `chore:` — Maintenance

## PR Guidelines

- Keep PRs focused on a single change
- Add tests for new functionality
- Update docs for API changes
- No `console.log` or debug code in production
- No secrets committed
