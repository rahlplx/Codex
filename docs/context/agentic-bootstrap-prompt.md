# Agentic Engineering Bootstrap Prompt

Use this prompt with Claude Code (or any AI coding agent) to bootstrap a new project with the full agentic engineering structure. Replace the `[PLACEHOLDERS]` with your project details.

---

## The Prompt

```
You are bootstrapping a new project called [PROJECT_NAME].

[ONE-PARAGRAPH DESCRIPTION OF WHAT THE PROJECT DOES]

Set up a production-grade agentic engineering folder structure with TDD workflow, persistent memory, telemetry, and multi-agent collaboration support. Follow these instructions exactly.

## 1. Create Folder Structure

```
[PROJECT_NAME]/
├── CLAUDE.md
├── .claude/
│   └── settings.json
├── .github/workflows/
│   └── ci.yml
├── docs/
│   ├── index/README.md          # Master catalog of ALL docs — start here
│   ├── knowledge/README.md      # Stable facts, references, domain knowledge
│   ├── agents/roles.md          # Agent role definitions
│   ├── memory/
│   │   ├── README.md            # Cross-session persistent state
│   │   ├── architecture.md      # Architectural decisions log
│   │   ├── api-quirks.md        # External API gotchas
│   │   └── lessons.md           # Mistakes and resolutions
│   ├── context/README.md        # Assembled context windows, prompt templates
│   ├── brainstorming/README.md  # Explorations, spikes (non-binding, disposable)
│   ├── specs/README.md          # Formal specs (binding, versioned, never deleted)
│   ├── features/README.md       # Per-feature design docs + acceptance criteria
│   └── todos/
│       ├── README.md
│       └── BACKLOG.md           # Prioritized task list (P0-P3)
├── logs/
│   ├── README.md
│   ├── telemetry/               # JSONL structured event logs
│   ├── sessions/                # Per-session AI run logs (gitignored)
│   └── pipeline/                # CI/CD run records
├── tests/
│   ├── README.md
│   ├── unit/
│   │   └── harness.sh           # Structural TDD harness
│   ├── integration/
│   └── e2e/
└── src/                         # Production code
```

## 2. CLAUDE.md Requirements

Write CLAUDE.md as the AI guidance file. It must contain:
- Project name and one-line description
- Full repository layout tree (matching above)
- Navigation guide: "What exists?" → index, "What to build?" → backlog, "Why?" → specs/brainstorming, "What do agents know?" → memory/context
- Document lifecycle table: brainstorming (exploratory) → specs (binding) → features (acceptance criteria) → todos (archived)
- TDD workflow: tests/ mirrors src/, write test before implementation
- Telemetry format: JSONL lines with ts, event, and context fields to logs/telemetry/
- Agent collaboration rules: read role doc first, write decisions to memory/, append-only, context in context/
- Specs vs brainstorming distinction: brainstorming is disposable, specs are versioned and never deleted
- CI pipeline stages: lint → unit → integration → e2e → telemetry
- Memory persistence format: `## YYYY-MM-DD — <title>` followed by one-paragraph summary

## 3. Memory Files — Seed with Initial Entries

Each memory file is append-only. Seed each with today's date and the bootstrap decision:

- **architecture.md**: Log the initial folder structure decision and tech stack choice
- **api-quirks.md**: Note any known API quirks for chosen dependencies (or add a placeholder entry noting the format)
- **lessons.md**: Add these proven lessons:
  - Use ASCII-only in CI YAML run steps (non-ASCII can cause silent failures)
  - Git doesn't track empty directories — always add .gitkeep or a real file
  - Command substitution doesn't work inside single quotes in bash
  - Ephemeral CI workspaces lose file writes — use GITHUB_STEP_SUMMARY or artifacts

## 4. Structural TDD Harness

Create `tests/unit/harness.sh` that validates the folder structure exists and is correct. It must:
- Use bash with `set -euo pipefail`
- Define pass/fail counters and helper functions: `assert_dir`, `assert_file`, `assert_nonempty`, `assert_contains`
- Check all required directories exist
- Check all required files are non-empty
- Verify specs have correct Status field
- Verify memory files have date entries
- Test write capability for logs/sessions/ and logs/telemetry/
- Verify index links resolve to real files
- Check CI workflow has required job names
- Print summary and exit 1 if any failures
- Append results to telemetry as JSONL

## 5. CI Pipeline

Create `.github/workflows/ci.yml` with:
- Trigger on push/PR to main
- Jobs: lint, unit-tests, integration-tests, e2e-tests, telemetry
- Unit-tests job runs `bash tests/unit/harness.sh`
- Each job uses ASCII-only in run steps
- Pipeline summary written to GITHUB_STEP_SUMMARY

## 6. .claude/settings.json

Configure with:
- Read-only tool permissions (Bash read, glob, grep, etc.)
- Git command permissions (git status, diff, log, add, commit, push)
- PostToolUse hook that appends JSONL telemetry to logs/telemetry/

## 7. First Spec

Create `docs/specs/SPEC-001-folder-structure.md` with:
- Problem: Why this structure is needed
- Decision: The adopted structure
- Rationale: What patterns it follows and why
- Alternatives Considered: At least 2 alternatives
- Status: Accepted

## 8. Index Catalog

`docs/index/README.md` must catalog EVERY document in the repo with:
- Relative links that resolve correctly
- Tables grouped by category (Specs, Features, Knowledge, Memory, Agents, etc.)
- Updated whenever a new doc is added

## 9. Backlog

`docs/todos/BACKLOG.md` with:
- Active section: table with Priority (P0-P3), Task, Owner, Feature columns
- Done section: table with Date, Task columns
- P0 = blocking everything, P1 = next sprint, P2 = important, P3 = nice to have
- First entry: the bootstrap task itself, marked as Done with today's date

## 10. .gitignore

Add rules for:
- logs/sessions/*.md (runtime, per-session)
- logs/telemetry/*.jsonl (runtime, per-environment)
- logs/pipeline/ contents
- Node/Python/IDE artifacts as appropriate for [TECH_STACK]
- .gitkeep files should NOT be ignored

## 11. Run and Verify

After creating everything:
1. Run `bash tests/unit/harness.sh` and fix any failures
2. Ensure ALL assertions pass with 0 failures
3. Commit with message: "Bootstrap agentic engineering folder structure"

Do NOT proceed to any feature work until the harness is green.
```

---

## Optional Add-ons

Append these sections to the prompt based on project needs:

### If using Google OKF (Open Knowledge Format)

```
## 12. Knowledge Base (OKF v0.1)

Create a `knowledge/` directory (separate from `docs/knowledge/`) using Google's Open Knowledge Format:
- Each concept = one markdown file with YAML frontmatter
- Only required frontmatter field is `type`
- Cross-references via standard markdown links
- Create index files: knowledge/index.md, knowledge/[category]/index.md
- Categories based on your domain (e.g., providers/, architecture/, models/, design/)
- Add knowledge/log.md as chronological change history
- Update harness to validate: directories exist, index files non-empty, YAML frontmatter present (assert_nonempty before assert_contains "^type:")
```

### If multi-agent collaboration

```
## 13. Agent Roles

Create AGENTS.md at repo root as an agentic engineering guide covering:
- Code style conventions
- File organization rules
- Git workflow (branch naming, commit messages)
- Testing strategy
- When to write specs vs just code
- Memory persistence rules

Define roles in docs/agents/roles.md:
- Architect: writes specs, makes tech decisions, updates architecture memory
- Engineer: implements features, writes tests, follows TDD
- DevOps: CI/CD, deployment, infrastructure
- Researcher: investigates external tools/APIs, writes knowledge docs
```

### If Docker deployment

```
## 14. Docker Setup

- Use relative paths for frontend-to-backend URLs (not Docker-internal hostnames)
- Never use depends_on for profile-gated optional services
- Use plain file paths for database connections (not ORM-specific URI formats)
- Add Docker resource limits appropriate for target VPS specs
```

---

## Usage Examples

**Minimal (any project):**
> Bootstrap [PROJECT_NAME]. [DESCRIPTION]. Set up agentic engineering folder structure with TDD, memory, telemetry. Tech stack: [STACK].

**Full (complex project):**
> Use the full prompt above with all placeholders filled in and relevant optional add-ons appended.

**Continuing an existing project:**
> This project already has source code in src/. Add agentic engineering structure around it without modifying existing code. Read the existing codebase first, then create the docs/, logs/, tests/ structure. Seed memory files with architectural decisions inferred from the existing code.
