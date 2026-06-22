# Specifications

Formal, versioned, binding technical decisions. A spec is written when a brainstorm is resolved and an approach is chosen.

## Template

```markdown
# SPEC-<NNN>: <Title>

**Status:** Draft | Accepted | Superseded by SPEC-<NNN>
**Date:** YYYY-MM-DD
**Author:** <agent or human>

## Problem
<What problem does this solve?>

## Decision
<What will be done?>

## Rationale
<Why this approach over alternatives?>

## Alternatives Considered
- **<Alt A>:** Rejected because <reason>
- **<Alt B>:** Rejected because <reason>

## Acceptance Criteria
- [ ] <measurable criterion>

## References
- [Related brainstorm](../brainstorming/YYYY-MM-DD-<slug>.md)
```

## Lifecycle Rules

- Specs are **never deleted**.
- To supersede a spec, create `SPEC-<NNN+1>` and update the old spec's Status field to `Superseded by SPEC-<NNN+1>`.
- Draft specs can be changed freely; Accepted specs require a new spec to change.
