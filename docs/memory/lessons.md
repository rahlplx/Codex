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
