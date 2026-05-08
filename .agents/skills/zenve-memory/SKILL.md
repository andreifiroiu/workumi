---
name: zenve-memory
description: Memory conventions and lifecycle for Zenve agents — what to persist, where, when to read, when to write, and what to clear. Load this skill at the start of any Zenve agent run that needs to carry context across runs. Triggers include "load memory", "agent memory", "zenve memory", "remember context across runs", or being referenced from an agent's RUN.md "On Start" step.
version: 1.0.0
---

# Zenve Memory

> Single source of truth for how a Zenve agent reads, writes, and clears memory across runs. All Zenve agents that need cross-run context should load this skill at the start of every run.

---

## 1. Files

A Zenve agent has two memory files, both inside its own agent directory:

- **`{agent_dir}/memory/long_term.md`** — structured, dated log of durable facts, decisions, and conventions. Pruned to the last 20 days. This is the agent's long-term coherence over time.
- **`{agent_dir}/memory/scratch.md`** — free-form quick notes the agent wants to remember from one run to the next. Survives across runs. Not dated, not pruned. Use it for breadcrumbs, half-formed thoughts, "next time, try X", reminders to self — anything that doesn't deserve a daily-log entry but is still worth carrying forward.

The `memory/` directory is not created at scaffold time — it is created at runtime on first write. Treat both files as optional: if they don't exist yet, behave as if they were empty.

`{agent_dir}` is resolved by the Zenve runtime to the absolute path of the agent's directory. Always write paths using this placeholder, never hard-code the path.

---

## 2. On Start

At the very beginning of every run:

1. Read `{agent_dir}/memory/long_term.md` if it exists — load the dated log of durable context.
2. Read `{agent_dir}/memory/scratch.md` if it exists — load quick notes left by the previous run.

Missing files are not an error. Carry on with empty context.

---

## 3. During the Run

- Write **durable, dated** facts, decisions, and conventions to `{agent_dir}/memory/long_term.md` using the daily log format (section 5).
- Write **quick free-form notes** to `{agent_dir}/memory/scratch.md` — breadcrumbs, reminders to self, "next time try X". Keep it short; prune it yourself when an entry stops being useful.
- Create the `memory/` directory lazily on first write if it does not exist.

---

## 4. Before Ending the Run

1. Update `{agent_dir}/memory/long_term.md` following the **Daily log format** (section 5).
2. Update `{agent_dir}/memory/scratch.md` with any quick notes worth carrying into the next run. **Do not clear it** — scratch survives across runs. Only delete entries that are no longer useful.

---

## 5. Daily Log Format for `long_term.md`

`long_term.md` is organised as a **reverse-chronological daily log**: newest day first, oldest day last. Each day is an `H1` heading with the date in `YYYY-MM-DD` (today's date in the local timezone), followed by bullet entries for that day.

```markdown
# 2026-05-07
- Switched task storage from `docs/tasks/` to `docs/plans/` to align with architect output. Why: architect now writes plans, not tasks; old path is dead.
- User confirmed monorepo deploys go through `just deploy-prod`, not `make`.

# 2026-05-06
- PRDs live in `docs/product/{feature}.md`. Why: pointer for next run, saves a search.
- Open question: should the dev agent run `pnpm test` before opening a PR? Confirm with user.

# 2026-04-22
- Decided to use RTK Query for all server data; never `useState` + `fetch`. Why: enforced by react-rules.
```

Rules when updating:

1. **Find or create today's section.** If an `# {today}` heading already exists at the top, append new bullets under it. Otherwise, insert a new `# {today}` section at the very top of the file.
2. **One fact per bullet.** Lead with the fact, then a short *Why:* clause so future runs can judge whether the memory is still load-bearing.
3. **No duplicates.** Before writing a new bullet, scan recent days for the same fact. If it exists and is still accurate, leave it where it is. If it has changed, add the corrected version under today and remove the obsolete one.
4. **Prune to the last 20 days.** After updating, count `H1` date headings. If there are more than 20, delete the oldest sections (bottom of the file) until exactly 20 remain. Anything older than 20 days is considered stale and is discarded.
5. **Empty days don't get a heading.** If you have nothing durable to add today, leave the file unchanged — do not create an empty `# {today}` section.

---

## 6. What to Save

Save things that are **non-obvious** and **useful in future runs**:

- Decisions and the reasoning behind them ("we chose RTK Query over SWR because…").
- Constraints from the user or stakeholders that aren't visible in the code.
- Conventions specific to this project that aren't already documented.
- Pointers to where information lives ("PRDs are in `docs/product/`").
- Open questions that the next run should resolve.

Lead with the fact, then a short *Why:* line so future runs can judge whether the memory is still load-bearing.

---

## 7. What NOT to Save

Do **not** save things that can be re-derived cheaply:

- Code patterns, file paths, or project structure — read the repo.
- Git history, recent commits, who-changed-what — `git log` / `git blame` are authoritative.
- Information already documented in `AGENTS.md`, `SOUL.md`, `CLAUDE.md`, PRDs, or design docs.
- Step-by-step task progress for the current run only — that belongs in `scratch.md`, not `long_term.md`, and even there only if useful.
- Duplicates of an existing memory entry — update the existing entry instead.

---

## 8. Verifying Stale Memory

Memory is a snapshot in time. If a memory references a specific file, function, or flag, verify it still exists before acting on it. If a recalled memory contradicts what the code currently says, trust the code and update the memory.
