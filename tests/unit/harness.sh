#!/usr/bin/env bash
# Structural TDD harness — verifies the agentic folder structure is complete and fetchable.
# Run from repo root: bash tests/unit/harness.sh
# Exit 0 = all pass. Exit 1 = failures found.

set -euo pipefail
PASS=0
FAIL=0
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

pass() { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }

assert_dir()  { [ -d "$ROOT/$1" ] && pass "dir exists: $1" || fail "dir missing: $1"; }
assert_file() { [ -f "$ROOT/$1" ] && pass "file exists: $1" || fail "file missing: $1"; }
assert_nonempty() {
  local f="$ROOT/$1"
  [ -f "$f" ] && [ -s "$f" ] && pass "non-empty: $1" || fail "empty or missing: $1"
}
assert_contains() {
  local f="$ROOT/$1" pattern="$2"
  grep -q "$pattern" "$f" 2>/dev/null && pass "contains '$pattern': $1" || fail "missing '$pattern' in: $1"
}

echo ""
echo "======================================"
echo " Codex Structural TDD Harness"
echo " $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "======================================"

# --- Loop 1: Required directories ---
echo ""
echo "[ Loop 1 ] Required directories"
assert_dir "docs/index"
assert_dir "docs/knowledge"
assert_dir "docs/agents"
assert_dir "docs/memory"
assert_dir "docs/context"
assert_dir "docs/brainstorming"
assert_dir "docs/specs"
assert_dir "docs/features"
assert_dir "docs/todos"
assert_dir "logs/telemetry"
assert_dir "logs/sessions"
assert_dir "logs/pipeline"
assert_dir "tests/unit"
assert_dir "tests/integration"
assert_dir "tests/e2e"
assert_dir "backend"
assert_dir "frontend"

# --- Loop 2: Required README/index files ---
echo ""
echo "[ Loop 2 ] Required README and index files"
assert_nonempty "CLAUDE.md"
assert_nonempty "docs/index/README.md"
assert_nonempty "docs/knowledge/README.md"
assert_nonempty "docs/agents/roles.md"
assert_nonempty "docs/memory/README.md"
assert_nonempty "docs/memory/architecture.md"
assert_nonempty "docs/memory/api-quirks.md"
assert_nonempty "docs/memory/lessons.md"
assert_nonempty "docs/context/README.md"
assert_nonempty "docs/brainstorming/README.md"
assert_nonempty "docs/specs/README.md"
assert_nonempty "docs/features/README.md"
assert_nonempty "docs/todos/BACKLOG.md"
assert_nonempty "docs/todos/README.md"
assert_nonempty "logs/README.md"
assert_nonempty "tests/README.md"
assert_nonempty ".claude/settings.json"
assert_nonempty ".github/workflows/ci.yml"

# --- Loop 3: First spec exists ---
echo ""
echo "[ Loop 3 ] First spec exists and is accepted"
assert_file "docs/specs/SPEC-001-folder-structure.md"
assert_contains "docs/specs/SPEC-001-folder-structure.md" "Status.*Accepted"

# --- Loop 4: Knowledge has at least one entry ---
echo ""
echo "[ Loop 4 ] Knowledge base has entries"
assert_contains "docs/knowledge/README.md" "Discovered:"

# --- Loop 5: Memory has entries ---
echo ""
echo "[ Loop 5 ] Memory files have entries"
assert_contains "docs/memory/README.md" "2026-06-22"
assert_contains "docs/memory/architecture.md" "2026-06-22"
assert_contains "docs/memory/api-quirks.md" "2026-06-22"
assert_contains "docs/memory/lessons.md" "2026-06-22"

# --- Loop 6: Session log write capability ---
# Checks the directory is writable; dated files are gitignored runtime state
# and won't exist in a fresh CI checkout, so we test capability not existence.
echo ""
echo "[ Loop 6 ] Session log write capability"
TEST_SESSION="$ROOT/logs/sessions/.harness-test.md"
TS6=$(date -u +%Y-%m-%dT%H:%M:%SZ)
mkdir -p "$ROOT/logs/sessions"
printf "# harness-test\nts: %s\n" "$TS6" > "$TEST_SESSION" \
  && pass "session log write succeeds" || fail "session log write failed"
grep -q "harness-test" "$TEST_SESSION" 2>/dev/null \
  && pass "session log readable" || fail "session log not readable"
TELEMETRY_TEST="$ROOT/logs/telemetry/.harness-loop6.jsonl"
mkdir -p "$ROOT/logs/telemetry"
echo "{\"ts\":\"$TS6\",\"event\":\"session_start\",\"agent\":\"harness\"}" >> "$TELEMETRY_TEST" \
  && pass "telemetry session_start write succeeds" || fail "telemetry session_start write failed"
echo "{\"ts\":\"$TS6\",\"event\":\"session_end\",\"agent\":\"harness\"}" >> "$TELEMETRY_TEST" \
  && pass "telemetry session_end write succeeds" || fail "telemetry session_end write failed"
grep -q "session_start" "$TELEMETRY_TEST" 2>/dev/null \
  && pass "telemetry contains session_start" || fail "telemetry missing session_start"
grep -q "session_end" "$TELEMETRY_TEST" 2>/dev/null \
  && pass "telemetry contains session_end" || fail "telemetry missing session_end"
rm -f "$TEST_SESSION" "$TELEMETRY_TEST"

# --- Loop 7: Index links resolve ---
echo ""
echo "[ Loop 7 ] Index catalog links resolve to real files"
assert_file "docs/agents/roles.md"
assert_file "docs/todos/BACKLOG.md"
assert_file "docs/memory/README.md"
assert_file "docs/memory/architecture.md"
assert_file "docs/memory/api-quirks.md"
assert_file "docs/memory/lessons.md"
assert_file "docs/context/README.md"
assert_file "docs/brainstorming/README.md"

# --- Loop 8: Telemetry write works ---
echo ""
echo "[ Loop 8 ] Telemetry write capability"
TEST_LOG="$ROOT/logs/telemetry/.harness-test.jsonl"
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
mkdir -p "$ROOT/logs/telemetry"
echo "{\"ts\":\"$TS\",\"event\":\"harness_test\",\"result\":\"write_ok\"}" >> "$TEST_LOG" \
  && pass "telemetry write succeeds" || fail "telemetry write failed"
rm -f "$TEST_LOG"

# --- Loop 9: CI workflow structure ---
echo ""
echo "[ Loop 9 ] CI workflow has all required jobs"
assert_contains ".github/workflows/ci.yml" "lint:"
assert_contains ".github/workflows/ci.yml" "unit-tests:"
assert_contains ".github/workflows/ci.yml" "integration-tests:"
assert_contains ".github/workflows/ci.yml" "e2e-tests:"
assert_contains ".github/workflows/ci.yml" "telemetry:"
assert_contains ".github/workflows/ci.yml" "ubuntu-latest"

# --- Loop 10: Settings hook is correct ---
echo ""
echo "[ Loop 10 ] Claude settings hook correctness"
assert_contains ".claude/settings.json" "mkdir -p logs/telemetry"
assert_contains ".claude/settings.json" "PostToolUse"

# --- Loop 11: Backend adapters ---
echo ""
echo "[ Loop 11 ] Backend adapters"
assert_nonempty "backend/src/adapters/base.ts"
assert_nonempty "backend/src/adapters/opencode-zen.ts"
assert_nonempty "backend/src/adapters/nemotron.ts"
assert_nonempty "backend/src/adapters/openrouter-free.ts"
assert_nonempty "backend/src/adapters/antigravity.ts"
assert_nonempty "backend/src/adapters/kilocode.ts"
assert_nonempty "backend/src/adapters/registry.ts"

# --- Loop 12: Backend orchestrator ---
echo ""
echo "[ Loop 12 ] Backend orchestrator"
assert_nonempty "backend/src/orchestrator/router.ts"
assert_contains "backend/src/orchestrator/router.ts" "NoAdapterAvailableError"

# --- Loop 13: Auth layer ---
echo ""
echo "[ Loop 13 ] Auth layer"
assert_nonempty "backend/src/auth/jwt.ts"
assert_nonempty "backend/src/auth/password.ts"
assert_nonempty "backend/src/auth/middleware.ts"
assert_nonempty "backend/src/auth/quota.ts"
assert_contains "backend/src/auth/jwt.ts" "generateToken"
assert_contains "backend/src/auth/middleware.ts" "authGuard"
assert_contains "backend/src/auth/quota.ts" "quota"

# --- Loop 14: API routes ---
echo ""
echo "[ Loop 14 ] API routes"
assert_nonempty "backend/src/server/routes/auth.ts"
assert_nonempty "backend/src/server/routes/admin.ts"
assert_nonempty "backend/src/server/routes/telemetry.ts"
assert_nonempty "backend/src/server/routes/chat.ts"
assert_nonempty "backend/src/server/routes/providers.ts"
assert_nonempty "backend/src/server/routes/threads.ts"
assert_contains "backend/src/server/routes/admin.ts" "requireRole"
assert_contains "backend/src/server/routes/telemetry.ts" "usage_log"

# --- Loop 15: Multi-tenant DB schema ---
echo ""
echo "[ Loop 15 ] Multi-tenant DB schema"
assert_contains "backend/src/storage/database.ts" "tenants"
assert_contains "backend/src/storage/database.ts" "tenant_keys"
assert_contains "backend/src/storage/database.ts" "usage_log"

# --- Loop 16: Server wiring ---
echo ""
echo "[ Loop 16 ] Server wiring"
assert_contains "backend/src/index.ts" "NemotronAdapter"
assert_contains "backend/src/index.ts" "OpenRouterFreeAdapter"
assert_contains "backend/src/server/httpServer.ts" "createAuthRouter"
assert_contains "backend/src/server/httpServer.ts" "createAdminRouter"
assert_contains "backend/src/server/httpServer.ts" "createTelemetryRouter"

# --- Loop 17: Docker deployment ---
echo ""
echo "[ Loop 17 ] Docker deployment"
assert_nonempty "docker-compose.yml"
assert_nonempty "backend/Dockerfile"
assert_nonempty "frontend/Dockerfile"
assert_nonempty "frontend/nginx.conf"
assert_contains "docker-compose.yml" "backend"
assert_contains "docker-compose.yml" "frontend"

# --- Loop 18: Frontend codex-agent extensions ---
echo ""
echo "[ Loop 18 ] Frontend codex-agent extensions"
assert_nonempty "frontend/src/composables/useCodexAgent.ts"
assert_contains "frontend/src/composables/useCodexAgent.ts" "isAdmin"
assert_nonempty "frontend/src/components/codex-agent/AdminDashboardPanel.vue"
assert_nonempty "frontend/src/components/codex-agent/TelemetryDashboardPanel.vue"
assert_nonempty "frontend/src/components/codex-agent/ProviderDashboardPanel.vue"
assert_contains "frontend/src/components/codex-agent/AdminDashboardPanel.vue" "isAdmin"
assert_contains "frontend/src/router/index.ts" "admin"
assert_contains "frontend/src/router/index.ts" "telemetry"

# --- Loop 19: New adapters wiring ---
echo ""
echo "[ Loop 19 ] New adapters wiring"
assert_contains "backend/src/adapters/antigravity.ts" "AntigravityAdapter"
assert_contains "backend/src/adapters/antigravity.ts" "generativelanguage.googleapis.com"
assert_contains "backend/src/adapters/kilocode.ts" "KiloCodeAdapter"
assert_contains "backend/src/index.ts" "AntigravityAdapter"
assert_contains "backend/src/index.ts" "KiloCodeAdapter"

# --- Loop 20: Model discovery scanner ---
echo ""
echo "[ Loop 20 ] Model discovery scanner"
assert_nonempty "backend/src/discovery/scanner.ts"
assert_contains "backend/src/discovery/scanner.ts" "ModelDiscoveryScanner"
assert_contains "backend/src/discovery/scanner.ts" "scan"
assert_contains "backend/src/discovery/scanner.ts" "findByCapability"
assert_contains "backend/src/index.ts" "ModelDiscoveryScanner"

# --- Summary ---
echo ""
echo "======================================"
echo " Results: ${PASS} passed, ${FAIL} failed"
echo "======================================"

# Append results to telemetry
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
mkdir -p "$ROOT/logs/telemetry"
echo "{\"ts\":\"$TS\",\"event\":\"test_run\",\"suite\":\"structural\",\"passed\":${PASS},\"failed\":${FAIL}}" \
  >> "$ROOT/logs/telemetry/$(date +%Y-%m-%d).jsonl"

[ "$FAIL" -eq 0 ]
