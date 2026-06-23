# Context

Assembled context windows and prompt templates for specific tasks. When starting a complex task, create a file here named `<task-slug>.md` that collects the relevant snippets, constraints, and agent instructions into a single, dense briefing.

## Template

```markdown
# Context: <task-slug>

**Date:** YYYY-MM-DD
**Agent:** <role>
**Goal:** <one sentence>

## Constraints
- <hard limits>

## Relevant Specs
- [spec-name](../specs/spec-name.md) — <why relevant>

## Relevant Knowledge
- <inline excerpt or link>

## Relevant Memory
- <inline excerpt or link>

## Starting state
<What exists now>

## Done when
<Concrete acceptance criteria>
```
