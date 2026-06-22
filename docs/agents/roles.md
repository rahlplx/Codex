# Agent Roles

Defines the purpose and boundaries of each agent that works in this repository.

## Architect

**Responsibility:** System design, specs, ADRs, and cross-cutting concerns.
**Writes to:** `docs/specs/`, `docs/brainstorming/`, `docs/memory/`
**Does NOT:** Write production code or tests.

## Engineer

**Responsibility:** Implementation of specs. TDD — test first.
**Writes to:** `src/`, `tests/`
**Does NOT:** Modify specs without Architect review.

## Reviewer

**Responsibility:** Code review, correctness checks, security review.
**Writes to:** PR comments, `docs/memory/` (lessons learned)
**Does NOT:** Push code directly.

## Telemetry

**Responsibility:** Log ingestion, pipeline monitoring, anomaly detection.
**Writes to:** `logs/telemetry/`, `logs/pipeline/`
**Does NOT:** Modify source or docs.

## Adding a New Role

Copy this template and add it above:

```markdown
## <Role Name>

**Responsibility:** <one sentence>
**Writes to:** <paths>
**Does NOT:** <hard boundaries>
```
