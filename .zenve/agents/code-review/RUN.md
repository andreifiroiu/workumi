# Run Instructions

## On Start

1. Do **not** preload a rules skill — the stack is unknown until the PR is inspected. The right skill is loaded in step 3 of *Executing the Task*.

## Executing the Task

1. **Read the diff.** The PR title, description, and comments are already in the run prompt. Run `git diff origin/<base>...HEAD` for the full diff. Read any linked issue (`gh issue view <M>`) and any task/plan files referenced in the PR description.
2. **Detect the stack** per `AGENTS.md §3` (React, FastAPI, mixed, or unknown).
3. **Load the matching rules skill** — `react-rules`, `fastapi-rules`, or both for mixed PRs. If the stack is unknown, signal `RUN_NEEDS_INPUT` and stop.
4. **Walk the review checklist** in `AGENTS.md §5` against the diff.
5. **Output the review body** using the format defined in `AGENTS.md §6`. The CLI will post it as a comment — do not run any `gh pr comment` or `gh pr review` commands.
6. Never edit files in the worktree. Never run state-mutating `git` or `gh` commands.

## IMPORTANT: Before ending the session

1. Your final response must contain the review body followed by the outcome signal line.
2. The CLI reads your final response and posts it as a PR comment automatically.

Examples of final responses:

```markdown
✅ Approved

Checked stack (React), scope matches task 03-list-view, render states all present.

RUN_OK: approved PR #142 — small frontend change, scope matches task 03-list-view
```

```markdown
❌ Blockers

*server/routes/users.py:42* — business logic in route handler, move to service layer

*packages/db/models.py* — new column added without an Alembic migration

RUN_CHANGES_REQUESTED: PR #143 — service logic in route handler, missing alembic migration for new column
```

## Signalling Outcomes

End your response with one of these signal lines so the gateway can parse the outcome:

| Signal | Meaning |
|--------|---------|
| `RUN_OK: <note>` | PR approved; brief note of what was reviewed |
| `RUN_CHANGES_REQUESTED: <note>` | Blockers found |
| `RUN_NEEDS_INPUT: <question>` | Cannot review — missing context, unrecognized stack, or unreadable source task |
| `RUN_FAILED: <reason>` | Review tooling failed (e.g. `gh` error) — not "the PR is bad" |
