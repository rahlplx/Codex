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
assert_dir "src"

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
assert_contains ".github/workflows/ci.yml" "self-hosted"

# --- Loop 10: Settings hook is correct ---
echo ""
echo "[ Loop 10 ] Claude settings hook correctness"
assert_contains ".claude/settings.json" "mkdir -p logs/telemetry"
assert_contains ".claude/settings.json" "PostToolUse"

# --- Loop 11: OKF knowledge base structure ---
echo ""
echo "[ Loop 11 ] OKF knowledge base structure"
assert_nonempty "knowledge/index.md"
assert_dir "knowledge/providers"
assert_dir "knowledge/routers"
assert_dir "knowledge/models"
assert_dir "knowledge/architecture"
assert_dir "knowledge/design"
assert_nonempty "knowledge/providers/index.md"
assert_nonempty "knowledge/routers/index.md"
assert_nonempty "knowledge/models/index.md"
assert_nonempty "knowledge/architecture/index.md"
assert_nonempty "knowledge/log.md"

# --- Loop 12: OKF provider docs have YAML frontmatter ---
echo ""
echo "[ Loop 12 ] OKF provider docs have YAML frontmatter"
for f in knowledge/providers/opencode-zen.md knowledge/providers/antigravity.md \
         knowledge/providers/kilocode.md knowledge/providers/nemotron.md \
         knowledge/providers/openrouter-free.md; do
  assert_nonempty "$f"
  assert_contains "$f" "^type:"
done

# --- Loop 13: OKF router docs have YAML frontmatter ---
echo ""
echo "[ Loop 13 ] OKF router docs have YAML frontmatter"
for f in knowledge/routers/nine-router.md knowledge/routers/cli-relay.md \
         knowledge/routers/cli-proxy-api.md knowledge/routers/ai-client-2-api.md; do
  assert_nonempty "$f"
  assert_contains "$f" "^type:"
done

# --- Loop 14: Architecture and design docs exist ---
echo ""
echo "[ Loop 14 ] Architecture and design docs"
assert_nonempty "ARCHITECTURE.md"
assert_nonempty "AGENTS.md"
assert_nonempty "knowledge/architecture/multi-tenant.md"
assert_nonempty "knowledge/architecture/vps-constraints.md"
assert_nonempty "knowledge/models/model-routing.md"
assert_nonempty "knowledge/models/free-models.md"
assert_nonempty "knowledge/design/provider-settings.md"

# --- Loop 15: ARCHITECTURE.md has key sections ---
echo ""
echo "[ Loop 15 ] ARCHITECTURE.md key sections"
assert_contains "ARCHITECTURE.md" "multi-tenant"
assert_contains "ARCHITECTURE.md" "Docker Compose"
assert_contains "ARCHITECTURE.md" "Tier 1"
assert_contains "ARCHITECTURE.md" "Tier 2"
assert_contains "ARCHITECTURE.md" "CLI Adapter Interface"

# --- Loop 16: SPEC-002 exists and is accepted ---
echo ""
echo "[ Loop 16 ] SPEC-002 tech stack"
assert_file "docs/specs/SPEC-002-tech-stack.md"
assert_contains "docs/specs/SPEC-002-tech-stack.md" "Status.*Accepted"

# --- Loop 17: Feature docs exist with acceptance criteria ---
echo ""
echo "[ Loop 17 ] Feature docs with acceptance criteria"
for feat in FEAT-001-provider-dashboard FEAT-002-multi-tenant-auth \
            FEAT-003-chat-interface FEAT-004-cli-adapter-system \
            FEAT-005-telemetry-dashboard FEAT-006-docker-deployment; do
  assert_nonempty "docs/features/$feat.md"
  assert_contains "docs/features/$feat.md" "Acceptance Criteria"
done

# --- Loop 18: Source code structure ---
echo ""
echo "[ Loop 18 ] Source code structure"
assert_dir "src/backend"
assert_dir "src/backend/src/adapters"
assert_dir "src/backend/src/orchestrator"
assert_dir "src/backend/src/auth"
assert_dir "src/backend/src/db"
assert_dir "src/backend/src/api"
assert_dir "src/frontend"
assert_dir "src/frontend/src"
assert_dir "src/shared"
assert_file "src/backend/src/server.ts"
assert_file "src/shared/src/types/adapter.types.ts"

# --- Loop 19: Backend adapters and orchestrator ---
echo ""
echo "[ Loop 19 ] Backend adapters and orchestrator"
assert_nonempty "src/backend/src/adapters/opencode-zen.ts"
assert_nonempty "src/backend/src/adapters/openrouter-free.ts"
assert_nonempty "src/backend/src/adapters/nemotron.ts"
assert_nonempty "src/backend/src/adapters/registry.ts"
assert_nonempty "src/backend/src/orchestrator/router.ts"
assert_nonempty "src/backend/src/orchestrator/health.ts"
assert_nonempty "src/backend/src/orchestrator/circuit-breaker.ts"

# --- Loop 20: Docker files ---
echo ""
echo "[ Loop 20 ] Docker deployment files"
assert_nonempty "docker-compose.yml"
assert_nonempty "src/backend/Dockerfile"
assert_nonempty "src/frontend/Dockerfile"
assert_contains "docker-compose.yml" "frontend"
assert_contains "docker-compose.yml" "backend"

# --- Loop 21: Frontend scaffolding ---
echo ""
echo "[ Loop 21 ] Frontend scaffolding"
assert_nonempty "src/frontend/package.json"
assert_nonempty "src/frontend/vite.config.ts"
assert_nonempty "src/frontend/index.html"
assert_nonempty "src/frontend/src/main.ts"
assert_nonempty "src/frontend/src/App.vue"
assert_nonempty "src/frontend/src/router/index.ts"
assert_nonempty "src/frontend/src/api/gateway.ts"

# --- Loop 22: Frontend components ---
echo ""
echo "[ Loop 22 ] Frontend components"
assert_nonempty "src/frontend/src/components/chat/ChatView.vue"
assert_nonempty "src/frontend/src/components/chat/MessageBubble.vue"
assert_nonempty "src/frontend/src/components/chat/ChatInput.vue"
assert_nonempty "src/frontend/src/components/chat/ThreadSidebar.vue"
assert_nonempty "src/frontend/src/components/auth/LoginPage.vue"
assert_nonempty "src/frontend/src/components/auth/RegisterPage.vue"
assert_nonempty "src/frontend/src/components/providers/ProviderDashboard.vue"
assert_nonempty "src/frontend/src/components/telemetry/TelemetryDashboard.vue"
assert_nonempty "src/frontend/src/components/layout/AppLayout.vue"

# --- Loop 23: Pinia stores ---
echo ""
echo "[ Loop 23 ] Pinia stores"
assert_nonempty "src/frontend/src/stores/auth.store.ts"
assert_nonempty "src/frontend/src/stores/thread.store.ts"
assert_nonempty "src/frontend/src/stores/provider.store.ts"
assert_nonempty "src/frontend/src/stores/telemetry.store.ts"

# --- Loop 24: pnpm workspace ---
echo ""
echo "[ Loop 24 ] Monorepo config"
assert_nonempty "pnpm-workspace.yaml"
assert_contains "pnpm-workspace.yaml" "src/shared"
assert_contains "pnpm-workspace.yaml" "src/backend"
assert_contains "pnpm-workspace.yaml" "src/frontend"

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
