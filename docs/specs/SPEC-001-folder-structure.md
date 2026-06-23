# SPEC-001: Agentic Engineering Folder Structure

**Status:** Accepted
**Date:** 2026-06-22
**Author:** Architect (Claude)

## Problem

A new AI-native repository needs a folder structure that supports multi-agent collaboration, persistent memory across sessions, structured knowledge retrieval, TDD workflows, and full telemetry — without imposing a specific tech stack.

## Decision

Adopt the following immutable top-level layout:

```
docs/{index,knowledge,agents,memory,context,brainstorming,specs,features,todos}
logs/{telemetry,sessions,pipeline}
tests/{unit,integration,e2e}
src/
.claude/{settings.json,commands/}
.github/workflows/
```

Each directory has a single, clear audience and lifecycle (see CLAUDE.md for full rules).

## Rationale

- **Single source of truth per concern**: memory never mixes with specs, telemetry never mixes with sessions.
- **Agent-navigable without code execution**: any AI agent can read `docs/index/` to discover all content without running queries.
- **Append-only memory**: prevents history rewriting across sessions.
- **Tech-stack-agnostic**: `src/` and `tests/` are empty until SPEC-002 (tech stack) is accepted.

## Alternatives Considered

- **Flat docs/ with no subdirs**: Rejected — becomes unsearchable past ~10 files.
- **Wiki / external tool**: Rejected — requires external dependency; docs must live in the repo for agents to read them inline.
- **Single AGENTS.md file**: Rejected — does not scale; conflates memory, specs, and brainstorming.

## Acceptance Criteria

- [x] All directories created and tracked in git
- [x] Every directory has a README explaining its purpose and format
- [x] `docs/index/README.md` catalogs all doc types
- [x] CLAUDE.md references all directories accurately
- [x] `.claude/settings.json` hooks write telemetry on Bash tool use
- [x] `.github/workflows/ci.yml` defines lint→unit→integration→e2e→telemetry pipeline

## References

- [CLAUDE.md](../../CLAUDE.md)
- Bootstrap commit: `3d6db77` (merged 2026-06-22)
