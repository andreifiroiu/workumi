# Run Instructions

## On Start

1. Load the `zenve-memory` skill — for memory conventions and lifecycle.
2. Load the appropriate rules skill for your stack based on `{project_stack}` (e.g. `react-rules` for React projects) for baseline architecture standards.
3. Read `{agent_dir}/DESIGN.md` — load the project's design system before any implementation.

## Executing the Task

- Complete the task described by the user.
- If assigned an issue, read the issue title, description, and latest architect comment.
- The architect comment contains the full plan (`# Plan: ...`) — use its `## Changes` as your implementation steps and `## Verification` as acceptance criteria.
- If a PRD path is referenced, read `docs/product/{feature}.md` for additional context.
- Implement only what is listed in the plan's `## Changes` and respect anything explicitly excluded.
- Stay within the tool permissions you have been given.

## IMPORTANT: Before ending the session:

Produce a final response that the gateway will store as the run result.

Here is an example of a final response:

```markdown
RUN_OK: PR #123 created for issue X
```

## Signalling Outcomes

End your response with one of these signal lines so the gateway can parse the outcome:

| Signal | Meaning |
|--------|---------|
| `RUN_OK: <note>` | Task completed successfully; brief note of what was done |
| `RUN_FAILED: <reason>` | Task failed; include a short reason |
| `RUN_NEEDS_INPUT: <question>` | Blocked; waiting for more information |
