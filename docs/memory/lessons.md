# Lessons Learned

Append-only log of mistakes, near-misses, and how they were resolved.

## 2026-06-22 — Non-ASCII characters in CI YAML run steps

**Mistake:** Used em dashes (`—`, U+2014) in `run:` echo strings inside `.github/workflows/ci.yml`. The Lint job failed with conclusion=failure, runner_id=0, completed in ~2s — indistinguishable from a billing issue. Root cause was never fully confirmed (logs were 404) but removing the em dashes in the next commit stopped the pattern.

**Resolution:** Use ASCII-only characters in `run:` shell commands in GitHub Actions YAML. Non-ASCII in YAML plain scalars is technically valid but can interact unexpectedly with runner environments.

## 2026-06-22 — Backtick command substitution inside single-quoted strings

**Mistake:** Initial `.claude/settings.json` telemetry hook used backtick syntax inside a single-quoted string: `echo '... `date` ...'`. In bash, command substitution (`$(...)` or `` `...` ``) does NOT evaluate inside single quotes. The literal string was written instead of the timestamp.

**Resolution:** Use single-quote concatenation: `'prefix_'$(command)'_suffix'` so the command substitution is outside the single-quoted section and evaluates correctly.

## 2026-06-23 — Docker Compose: browser can't resolve Docker-internal hostnames

**Mistake:** Set `VITE_BACKEND_URL=http://backend:3001` in Docker Compose — `backend` is a container name resolvable only inside the Docker network, not from the user's browser. Would cause `ERR_NAME_NOT_RESOLVED`.

**Resolution:** Use relative path `VITE_BACKEND_URL=/api` and let the reverse proxy (Caddy) route `/api/*` to the backend container. Browser never needs to know container names.

## 2026-06-23 — Docker Compose: depends_on with profile-gated services

**Mistake:** Backend service had `depends_on: nine-router`, but nine-router was under `profiles: [routers]`. Default `docker compose up` would fail because the dependency isn't in the active profile.

**Resolution:** Remove `depends_on` for optional sidecars. Backend must gracefully handle missing sidecars — check health on startup, skip unavailable routers.

## 2026-06-23 — SQLite connection strings differ between ecosystems

**Mistake:** Used `sqlite:///app/data/codex.db` (Python/SQLAlchemy format) for a Node.js backend. Node.js ORMs use different formats: Prisma wants `file:`, Sequelize wants `sqlite:`, better-sqlite3 wants just a file path.

**Resolution:** Use `DATABASE_PATH=/app/data/codex.db` (plain file path) and let the ORM adapter handle connection internally. Avoids coupling to any specific ORM's connection string format.

## 2026-06-23 — Gemini CLI is dead; free tiers shift constantly

**Lesson:** Gemini CLI deprecated June 18, 2026. iFlow and Qwen CLI free tiers also discontinued in 2026. Free AI model availability changes on weekly/daily basis. Never hard-code model assumptions — use dynamic discovery with health probing and fallback chains.

## 2026-06-22 — Ephemeral CI workspace: file writes are lost

**Mistake:** Telemetry step wrote pipeline run records to `logs/pipeline/<run_id>.jsonl` in the checkout workspace, without committing or uploading as an artifact. The file was silently discarded when the job completed.

**Resolution:** Switched to `$GITHUB_STEP_SUMMARY` which renders a markdown table in the Actions UI and persists without any extra steps.

## 2026-06-23 — Empty directories not tracked by git without .gitkeep

**Lesson:** Git does not track empty directories. All directories needed a `.gitkeep` placeholder or a real file to appear in the repo after clone. All `logs/` and `tests/` subdirs have `.gitkeep` files. Future agents: when creating a new directory, always add a `.gitkeep` or initial README immediately.
