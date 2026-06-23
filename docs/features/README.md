# Features

Per-feature design documents. Each file describes one user-facing or system feature including its acceptance criteria and current implementation status.

## Template

```markdown
# Feature: <name>

**Status:** Planned | In Progress | Done | Cancelled
**Spec:** [SPEC-<NNN>](../specs/SPEC-<NNN>.md)
**Branch:** `feature/<slug>`

## Summary
<One paragraph: what this feature does and why>

## Acceptance Criteria
- [ ] <observable behavior 1>
- [ ] <observable behavior 2>

## Implementation Notes
<Architecture decisions specific to this feature>

## Test Coverage
- Unit: `tests/unit/<path>`
- Integration: `tests/integration/<path>`
- E2E: `tests/e2e/<path>`
```
