# Tests

TDD test suite. Tests are written before implementation.

## Structure

```
tests/
├── unit/          # Pure logic, no I/O, fast (<1s total)
├── integration/   # Real dependencies in Docker, sandboxed
└── e2e/           # Full system, real environment
```

## Rules

- Test file mirrors source file: `src/foo/bar.ts` → `tests/unit/foo/bar.test.ts`
- A failing test must exist before implementation begins.
- Each test has exactly one assertion concept (can have multiple asserts for that concept).
- Integration tests use a dedicated test database/bucket, never production.

## Running Tests

Commands will be added here once a tech stack is chosen. See `docs/todos/BACKLOG.md`.
