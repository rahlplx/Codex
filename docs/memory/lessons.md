# Lessons Learned

Append-only log of mistakes, near-misses, and how they were resolved.

## 2026-06-22 — Non-ASCII characters in CI YAML run steps

**Mistake:** Used em dashes (`—`, U+2014) in `run:` echo strings inside `.github/workflows/ci.yml`. The Lint job failed with conclusion=failure, runner_id=0, completed in ~2s — indistinguishable from a billing issue. Root cause was never fully confirmed (logs were 404) but removing the em dashes in the next commit stopped the pattern.

**Resolution:** Use ASCII-only characters in `run:` shell commands in GitHub Actions YAML. Non-ASCII in YAML plain scalars is technically valid but can interact unexpectedly with runner environments.

## 2026-06-22 — Backtick command substitution inside single-quoted strings

**Mistake:** Initial `.claude/settings.json` telemetry hook used backtick syntax inside a single-quoted string: `echo '... `date` ...'`. In bash, command substitution (`$(...)` or `` `...` ``) does NOT evaluate inside single quotes. The literal string was written instead of the timestamp.

**Resolution:** Use single-quote concatenation: `'prefix_'$(command)'_suffix'` so the command substitution is outside the single-quoted section and evaluates correctly.

## 2026-06-22 — Ephemeral CI workspace: file writes are lost

**Mistake:** Telemetry step wrote pipeline run records to `logs/pipeline/<run_id>.jsonl` in the checkout workspace, without committing or uploading as an artifact. The file was silently discarded when the job completed.

**Resolution:** Switched to `$GITHUB_STEP_SUMMARY` which renders a markdown table in the Actions UI and persists without any extra steps.

## 2026-06-23 — Empty directories not tracked by git without .gitkeep

**Lesson:** Git does not track empty directories. All directories needed a `.gitkeep` placeholder or a real file to appear in the repo after clone. All `logs/` and `tests/` subdirs have `.gitkeep` files. Future agents: when creating a new directory, always add a `.gitkeep` or initial README immediately.

## 2026-06-23 — Self-hosted runner requires RUNNER_ALLOW_RUNASROOT=1 on root containers

**Mistake:** GitHub Actions runner exits with "Must not run with sudo" when the OS user is root. In ephemeral cloud containers the default user is root.

**Resolution:** `export RUNNER_ALLOW_RUNASROOT=1` before `./config.sh` and `./run.sh`. Document this in setup-runner.sh comments.

## 2026-06-23 — runner_id: 0 looks identical to billing-gated allocation failure

**Lesson:** When a self-hosted job is queued but no runner is online, check runs show `runner_id: 0, conclusion: null` — same as ubuntu-latest quota exhaustion. Always verify runner status in the GitHub UI (Settings → Actions → Runners) before assuming a billing issue.

## 2026-06-23 — Harness assertions for gitignored runtime files always fail in CI

**Mistake:** Loop 6 asserted existence of `logs/sessions/2026-06-23-full-audit.md` and `logs/telemetry/2026-06-23.jsonl`. These are gitignored runtime files that don't exist in a fresh clone.

**Resolution:** Replace existence checks with write-capability checks: create a hidden temp file (`.harness-test.*`), verify it's readable, then delete it. This tests the same property (directory is writable) without requiring pre-existing runtime state.

## 2026-06-23 — Harness assertions must evolve with the codebase

**Mistake:** Harness Loop 9 asserted `self-hosted` in ci.yml, but the CI was migrated to `ubuntu-latest`. The harness reported a false failure (120/121) because the assertion was stale.

**Resolution:** When changing infrastructure (CI runners, build tools, deployment), always grep the harness for related assertions and update them. Treat the harness as a living document, not a one-time snapshot.

## 2026-06-23 — GitHub Actions runner_id:0 is a billing issue, not a code issue

**Lesson:** After multiple CI re-runs showing runner_id:0, conclusion:failure, and no logs (HTTP 404), the pattern was confirmed as GitHub Actions billing/quota exhaustion on the account. TypeScript compiled cleanly and 284 tests passed locally. Don't waste time debugging code when the runner never allocated — check billing first.

## 2026-06-23 — Root package.json needs test-time deps when tests import from backend/

**Mistake:** Vitest tests at `tests/unit/server/*.test.ts` import from `backend/src/` but run from the backend directory via vitest.config.ts. However, deps like `supertest`, `express`, and `better-sqlite3` must be available from the resolution root. Initially only `supertest` was installed at root; `express` was missing.

**Resolution:** Either install shared deps at root for test resolution, or configure vitest to resolve from backend/node_modules. Current approach: root package.json includes supertest + express + better-sqlite3 as devDependencies.
