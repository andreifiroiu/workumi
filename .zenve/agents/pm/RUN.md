# Run Instructions

## On Start

1. Load the `zenve-memory` skill — for memory conventions and lifecycle.

## Executing the Task

- Complete the task described by the user.
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
