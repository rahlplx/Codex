#!/usr/bin/env bash
# Codex E2E Simulation Framework entry point.
# Run from repo root: bash tests/e2e/run.sh
# Options:
#   SIM_MAX_ITERATIONS=5 bash tests/e2e/run.sh
#   JWT_SECRET=my-secret bash tests/e2e/run.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "=== Codex E2E Simulation ==="
echo "Root: $ROOT"
echo "Node: $(node --version)"

mkdir -p "$ROOT/logs/telemetry" "$ROOT/logs/sessions"

# Make tsx available from backend node_modules
export PATH="$ROOT/backend/node_modules/.bin:$PATH"

# JWT_SECRET is also set inside runner.ts before imports, but export here for CI visibility
export JWT_SECRET="${JWT_SECRET:-sim-secret-codex-e2e-minimum-32ch!!}"
export SIM_MAX_ITERATIONS="${SIM_MAX_ITERATIONS:-3}"

# Run from backend/ so tsx uses backend/tsconfig.json for module resolution
cd "$ROOT/backend"
exec npx tsx --tsconfig tsconfig.json "../tests/e2e/runner.ts"
