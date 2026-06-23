# Knowledge Base

Stable, curated facts about the domain, external APIs, and system constraints. These are truths that don't change often and can be cited by agents without re-researching.

## How to use

- Read before implementing anything that touches an external system.
- Add entries here when you discover a constraint that cost time to find.
- Each entry should be a self-contained fact with a source or date discovered.

## Entries

---

### GitHub Actions: Self-Hosted Runner Required

**Discovered:** 2026-06-22
**Source:** CI run failures on PR #2

GitHub-hosted runners (`ubuntu-latest`) require active billing on the account. When billing is inactive, jobs are created but never assigned a runner (`runner_id: 0`, `runner_name: ""`), completing immediately with `conclusion: failure`. The only remedy without resolving billing is a self-hosted runner.

**Setup:** `github.com/<owner>/<repo>/settings/actions/runners` → New self-hosted runner. GitHub provides a 3-command install script. The runner must be online and idle for jobs tagged `runs-on: self-hosted` to execute.

**Current state:** All CI jobs in `.github/workflows/ci.yml` use `runs-on: self-hosted`. A runner must be registered to unblock CI.

---

### GitHub Actions: Expression Syntax for Hyphenated Job IDs

**Discovered:** 2026-06-23
**Source:** Code review during bootstrap

In GitHub Actions expression syntax, hyphens in job IDs accessed via the `needs` context should use bracket notation: `needs['unit-tests'].result`. Dot notation (`needs.unit-tests.result`) may parse the hyphen as a subtraction operator depending on evaluator version. The current workflow uses dot notation — update to bracket notation when a runner is available to verify.
