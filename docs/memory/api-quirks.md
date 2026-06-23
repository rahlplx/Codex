# API Quirks Memory

Append-only log of external API oddities discovered during development.

## 2026-06-22 — GitHub Actions runners fail silently on billing issues

When a GitHub account has exhausted Actions minutes or has inactive billing, jobs targeting `ubuntu-latest` (GitHub-hosted runners) are created and immediately concluded as `failure` with `runner_id: 0` and `runner_name: ""`. No error is surfaced in the job steps — logs return HTTP 404 because no runner ever executed them. Fix: switch to `self-hosted` runners or resolve billing.

## 2026-06-22 — GitHub Actions log retention is very short

Job logs returned HTTP 404 within minutes of job completion in this environment. Do not rely on `get_job_logs` MCP tool for post-mortem debugging; add step summaries (`$GITHUB_STEP_SUMMARY`) and artifact uploads instead so evidence survives.

## 2026-06-23 — GitHub Actions `needs` context bracket notation for hyphens

Job IDs with hyphens (e.g. `unit-tests`) should be accessed in `needs` context via bracket notation: `needs['unit-tests'].result`. Dot notation (`needs.unit-tests.result`) may parse the hyphen as arithmetic subtraction in some evaluator versions. Current workflow uses dot notation; update when a self-hosted runner is available to test.
