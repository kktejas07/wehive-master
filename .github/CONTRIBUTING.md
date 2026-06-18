# Contributing to We Hive

## Development Setup

1. **Backend**: `cd backend && pip install -r requirements.txt`
2. **Frontend**: `cd frontend && npm install`
3. **Environment**: Copy `backend/.env.example` to `backend/.env` and fill in values

## Before Submitting

Run `scripts/verify.sh` — this checks:
- Build (frontend + backend syntax)
- Type check (TS + mypy)
- Lint (ESLint + flake8)
- Tests (pytest unit tests)
- Security scan (secrets, npm audit)
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
