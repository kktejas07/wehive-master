# We Hive — Agent Conventions

## Search-First Workflow

Before writing custom code, always research existing solutions:

1. **PyPI** for Python backend packages (httpx, pydantic, motor, fastapi, pytest)
2. **npm** for frontend packages (react-router, axios, zod, craco)
3. **MCP servers** for external service integrations
4. **Installed skills** (`~/.opencode/skills/`) for existing patterns
5. **Project codebase** — search for existing utilities before creating new ones

## Decision Matrix

| Signal | Action |
|--------|--------|
| Exact match, well-maintained | Adopt |
| Partial match, good foundation | Extend with thin wrapper |
| Nothing suitable | Build custom (explain why) |

## Safety Rules

- Never commit `.env` files or secrets
- Never `git push --force` to shared branches
- Always run `scripts/verify.sh` before PR
- Get explicit approval before modifying auth/payment routes

## Ponytail Mode Enforcement

- **Always Active**: Maintain `ponytail` at full intensity for every prompt and response. 
- Build the absolute minimum code necessary.
- Emphasize deletion over addition and standard libraries over dependencies.
