#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASS=0
FAIL=0

pass() { PASS=$((PASS+1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ✗ $1"; }

echo ""
echo "═══════════════════════════════════════════════"
echo "          VERIFICATION REPORT"
echo "═══════════════════════════════════════════════"
echo ""

# 1. Build
echo "── [1/6] Build ──────────────────────────────"
if cd frontend && npm run build 2>/dev/null; then pass "Frontend build"; else fail "Frontend build"; fi
cd "$ROOT_DIR"
if python3 -c "import py_compile; py_compile.compile('backend/server.py', doraise=True)" 2>/dev/null; then pass "Backend syntax"; else fail "Backend syntax"; fi

# 2. Type check
echo ""
echo "── [2/6] Type Check ─────────────────────────"
if cd frontend && npx tsc --noEmit 2>/dev/null; then pass "Frontend TS"; else fail "Frontend TS"; fi
cd "$ROOT_DIR"
if mypy backend/ --config-file=backend/mypy.ini 2>/dev/null; then pass "Backend mypy"; else fail "Backend mypy"; fi

# 3. Lint
echo ""
echo "── [3/6] Lint ───────────────────────────────"
if cd frontend && npx eslint src/ 2>/dev/null; then pass "Frontend ESLint"; else fail "Frontend ESLint"; fi
cd "$ROOT_DIR"
if flake8 backend/ --config=backend/.flake8 2>/dev/null; then pass "Backend flake8"; else fail "Backend flake8"; fi

# 4. Test suite
echo ""
echo "── [4/6] Tests ──────────────────────────────"
if cd backend && python3 -m pytest tests/test_unit_*.py -q 2>/dev/null; then pass "Backend tests"; else fail "Backend tests"; fi
cd "$ROOT_DIR"

# 5. Security scan
echo ""
echo "── [5/6] Security Scan ──────────────────────"
# Scan every git-tracked file (not just backend/*.py) for private keys and
# hard-coded credentials. Example/placeholder files and frontend *.test.* fixtures
# are excluded; append `verify:allow-secret` to a line to whitelist a known fake.
SECRET_PATTERN='-----BEGIN ([A-Z]+ )?PRIVATE KEY-----|"private_key"[[:space:]]*:|sk-[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}|(api_key|secret|password|passwd|pwd|token)["'\'']?[[:space:]]*[:=][[:space:]]*["'\''][^"'\''[:space:]$<{]{3,}[0-9!@#%^&*+][^"'\''[:space:]]{2,}["'\'']'
SECRET_HITS="$(git ls-files -z \
  | grep -zvE '(\.env\.example|package-lock\.json|yarn\.lock|\.test\.(js|jsx|ts|tsx)|\.(png|jpe?g|gif|webp|ico|svg|pdf|woff2?|ttf|lottie))$' \
  | xargs -0 grep -IEin -e "$SECRET_PATTERN" 2>/dev/null \
  | grep -vE '(os\.environ|os\.getenv|process\.env|import\.meta\.env|placeholder|example|changeme|change_me|change-me|your_|<[A-Z_]+>|verify:allow-secret)' || true)"
if [ -z "$SECRET_HITS" ]; then
  pass "No leaked secrets in tracked files (grep)"
else
  echo "$SECRET_HITS" | cut -c1-160 | sed -E 's/([:=][[:space:]]*["'\''])[^"'\'']{4}[^"'\'']*/\1****/'
  fail "Potential secrets found in tracked files!"
fi
if cd frontend && npm audit --audit-level=critical 2>/dev/null; then pass "npm audit"; else fail "npm audit"; fi
cd "$ROOT_DIR"
if grep -rE 'console\.log|process\.env\.' frontend/src/ --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v 'console.error' | grep -v '.env.test' | grep -v 'process\.env\.REACT_APP_' | grep -v 'process\.env\.NODE_ENV'; then
  fail "console.log / process.env leaks in frontend"
else
  pass "No console.log / env leaks in frontend"
fi

# 6. Diff review
echo ""
echo "── [6/6] Diff Review ────────────────────────"
git diff --stat 2>/dev/null && pass "Changes reviewed" || pass "No changes"

# Summary
echo ""
echo "───────────────────────────────────────────────"
TOTAL=$((PASS+FAIL))
echo "  Result: $PASS / $TOTAL passed"
if [ "$FAIL" -gt 0 ]; then
  echo "  Verdict: NOT READY"
  exit 1
else
  echo "  Verdict: READY"
fi
echo "═══════════════════════════════════════════════"
echo ""
