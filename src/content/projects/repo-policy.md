---
title: "repo-policy — Declarative GitHub Repository Governance"
description: "CLI + GitHub Action that reconciles branch protection and repository rulesets against a versioned policy.yml — validate/audit/plan/apply, dual enforcement backends, fail-closed schema validation. Published to PyPI; governs its own repo."
tags: ["Python", "GitHub API", "Policy as Code", "CLI", "GitHub Actions", "Pydantic"]
github: "https://github.com/shipsolid/repo-policy"
status: "active"
featured: true
order: 2
results:
  - "Published to PyPI (`pip install repo-policy`), v0.5.0 — 392 tests, 95% coverage gate enforced in CI"
  - "Self-governing: audits its own branch protection daily via its own `audit` command, not a manual check"
  - "Supply-chain hardened — SSH-signed release tags, full-SHA-pinned GitHub Action, fail-closed schema (unknown fields, coerced types, and duplicate YAML keys all rejected before any API call)"
---

Branch protection and repository rulesets live in GitHub's settings UI by default — no diff, no
review, no audit trail. `repo-policy` turns that into a `policy.yml` file: declare what a branch
should require, then `validate`/`audit`/`plan`/`apply` it locally, in CI, or via the shipped
GitHub Action.

## Architecture

A single external dependency — the GitHub REST API — with no state file and no backend, so it's
safe to adopt incrementally on a repository that's already live: by default it only ever touches
the branches and fields you declare. `config.py` parses `policy.yml` into a Pydantic model
(`models.py`); `diff.py` resolves the desired state and diffs it against live GitHub, and that one
diff engine backs `audit`, `plan`, and `apply` alike, so the three commands can never disagree
about what "compliant" means. Each declared branch is reconciled through one of two backends —
classic branch protection or GitHub Rulesets, selected per branch — with `pull_requests.py` and
`status_checks.py` shared between both so a field's meaning can't drift depending on which
backend a branch uses. `apply` runs preflight → mutate → an independent post-apply re-verification
against fresh GitHub state before it reports success, and a partial-apply journal records exactly
what succeeded before any mutation failure, so a re-run is always safe.

## Trade-offs

**No state file, managed-scope by default** — rejected the Terraform model on purpose. Without a
state file, `repo-policy` can't tell "not declared" from "declared to be absent," so by default it
only ever touches what's in `policy.yml` and never deletes anything you didn't ask it to manage.
Strict mode opts a branch (or the whole policy) into full desired-state enforcement instead —
trading that safety for completeness when a team wants it.

**Dual enforcement backends instead of picking one** — classic branch protection and GitHub
Rulesets model overlapping but not identical fields (rulesets have no equivalent for
`enforce_admins`, `dismissal_restrictions`, etc.). Supporting both, with per-branch selection,
meant designing a schema that's honest about which fields are backend-specific rather than
pretending the two are interchangeable.

**Fail closed over fail permissive** — every schema model uses Pydantic's `extra="forbid"` and
`strict=True`: a typo'd field name or a quoted `"true"` is a validation error at `validate` time,
before any API call, rather than a silently-ignored no-op or a coerced value that doesn't mean
what the author intended.

## Lessons Learned

`secrets.GITHUB_TOKEN` cannot administer branch protection or rulesets under any `permissions:`
grant — confirmed against a live repo, not documented anywhere obvious beforehand. That's a
platform constraint, not a workflow misconfiguration, and it shapes the whole GitHub Action
story: it needs a real PAT (`repo` scope classic, or `Administration: Read and write`
fine-grained) stored as a secret, which is a meaningfully worse first-run experience than "just
add the Action."

Self-governance surfaced its own edge case: the daily audit workflow authenticates with a
deliberately narrow, read-only PAT, which means it permanently reports two repo-wide settings
(`delete_branch_on_merge`, `allow_update_branch`) as unavailable rather than compliant — a
scheduled workflow that will always show red by design, not evidence of drift. Documenting that
distinction clearly (rather than widening the token's scope to make the run go green) was the
harder and more honest call.
