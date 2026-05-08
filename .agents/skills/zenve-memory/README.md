# zenve-memory

Claude Code skill that defines the memory conventions and lifecycle for Zenve agents. Loaded by any Zenve agent that needs to carry context across runs, so the contract lives in one place instead of being duplicated in every agent's `RUN.md`.

## Install

```bash
npx skills add zenve-ai/zenve-registry/skills --skill zenve-memory
```

## Usage

Reference this skill from an agent's `RUN.md` "On Start" step:

```markdown
## On Start

1. Load the `zenve-memory` skill — for memory conventions and lifecycle.
2. ...
```

And register it in the agent's `manifest.yaml`:

```yaml
skills:
  - zenve-memory
```

## What it covers

**Files** — `{agent_dir}/memory/long_term.md` (dated log of durable facts, last 20 days) and `{agent_dir}/memory/scratch.md` (free-form quick notes carried from run to run, not cleared).

**Lifecycle** — when to read on start, when to write during the run, what to update and clear before ending.

**Daily log format** — `long_term.md` is a reverse-chronological log with one `# YYYY-MM-DD` section per day; only the last 20 days are kept, older sections are pruned automatically.

**What to save** — non-obvious facts, decisions, constraints, pointers, open questions; lead with the fact and a *Why:* line.

**What NOT to save** — anything re-derivable from the codebase, git history, or existing project docs.

**Stale memory** — verify file/function references still exist before acting; trust the code over the memory if they conflict.
