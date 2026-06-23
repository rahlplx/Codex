#!/usr/bin/env bash
# Self-hosted GitHub Actions runner setup for rahlplx/Codex
# Run this on the machine that will execute CI jobs.
# Requires: GITHUB_TOKEN env var with repo scope, or pass --token <token>
#
# Usage:
#   export GITHUB_TOKEN=ghp_...
#   bash scripts/setup-runner.sh
#
# Or with explicit token:
#   bash scripts/setup-runner.sh --token ghp_...

set -euo pipefail

OWNER="rahlplx"
REPO="Codex"
RUNNER_DIR="${HOME}/actions-runner"
RUNNER_VERSION="2.325.0"

# --- Parse args ---
TOKEN="${GITHUB_TOKEN:-}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --token) TOKEN="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$TOKEN" ]]; then
  echo ""
  echo "ERROR: No GitHub token found."
  echo "  Set GITHUB_TOKEN env var or pass --token <your_token>"
  echo ""
  echo "  Get a token at: https://github.com/settings/tokens"
  echo "  Required scopes: repo (for private repos) or public_repo (for public)"
  exit 1
fi

echo ""
echo "=== Codex Self-Hosted Runner Setup ==="
echo "  Repo:    ${OWNER}/${REPO}"
echo "  Dir:     ${RUNNER_DIR}"
echo "  Version: ${RUNNER_VERSION}"
echo ""

# --- Detect OS/arch ---
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

RUNNER_PKG="actions-runner-${OS}-${ARCH}-${RUNNER_VERSION}.tar.gz"
RUNNER_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_PKG}"

# --- Get registration token ---
echo "Fetching registration token..."
REG_TOKEN=$(curl -fsSL \
  -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${OWNER}/${REPO}/actions/runners/registration-token" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "  Got registration token."

# --- Download runner ---
mkdir -p "${RUNNER_DIR}"
cd "${RUNNER_DIR}"

if [[ ! -f "${RUNNER_PKG}" ]]; then
  echo "Downloading runner package..."
  curl -fsSL -O "${RUNNER_URL}"
fi

echo "Extracting..."
tar xzf "${RUNNER_PKG}"

# --- Configure ---
echo "Configuring runner..."
./config.sh \
  --url "https://github.com/${OWNER}/${REPO}" \
  --token "${REG_TOKEN}" \
  --name "$(hostname)-runner" \
  --labels "self-hosted" \
  --unattended \
  --replace

# --- Install as service (Linux/macOS) ---
if command -v systemctl &>/dev/null; then
  echo "Installing as systemd service..."
  sudo ./svc.sh install
  sudo ./svc.sh start
  echo ""
  echo "Runner installed and started as systemd service."
  echo "  Status:  sudo systemctl status actions.runner.${OWNER}-${REPO}.$(hostname)-runner"
  echo "  Logs:    sudo journalctl -u actions.runner.${OWNER}-${REPO}.$(hostname)-runner -f"
elif [[ "$OS" == "darwin" ]]; then
  echo "Installing as launchd service..."
  ./svc.sh install
  ./svc.sh start
  echo ""
  echo "Runner installed and started as launchd service."
else
  echo ""
  echo "Runner configured. Start it manually:"
  echo "  cd ${RUNNER_DIR} && ./run.sh"
fi

echo ""
echo "=== Done ==="
echo "Runner is now online. Push a commit to ${OWNER}/${REPO} to trigger CI."
echo ""
echo "To remove the runner later:"
echo "  cd ${RUNNER_DIR} && ./config.sh remove --token <remove_token>"
