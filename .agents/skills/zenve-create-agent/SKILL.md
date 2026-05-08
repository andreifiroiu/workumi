---
name: zenve-create-agent
description: This skill should be used when the user asks to "create a new zenve agent", "scaffold a zenve agent", "add a new zenve agent", or "new agent in .zenve". Scaffolds a Zenve agent directory under .zenve/agents/{slug}/ with manifest.yaml, SOUL.md, AGENTS.md, RUN.md, and HEARTBEAT.md.
version: 1.0.0
---

# Zenve Create Agent

Scaffold a new Zenve agent. Creates `./.zenve/agents/{slug}/` with the 5 required files. Existing agents in the same `.zenve/agents/` directory are reference examples — read one before filling in role-specific detail.

## 1. Gather inputs from the user

Ask the user for any of these that aren't already provided:

- **`{agent_name}`** — display name, e.g. `FastAPI Developer`, `React Developer`, `Product Manager`.
- **`{slug}`** — kebab-case directory name, e.g. `fastapi-dev`, `react-dev`, `pm`. Must not already exist under `.zenve/agents/`.
- **`{description}`** — one-line summary for `manifest.yaml`, e.g. `Builds and maintains FastAPI services — routes, models, migrations, tests.`
- **`{role}`** — short role label used inside `AGENTS.md` and `SOUL.md`, e.g. `Python Developer`, `React Developer`, `Product Manager`, `Frontend Architect`.
- **`{mode}`** — pick one:
  - `code_pr` — agent writes code and opens pull requests (typical for developer agents).
  - `artifact_pr` — agent writes Markdown artifacts only (PRDs, plans, task files); does not edit source code (typical for PM, architect, planner agents).
- **`{tools}`** — comma list of tools the agent may use. Default: `Read, Write, Bash`. PM-style agents often add `WebSearch, WebFetch`.
- **`{skills}`** — comma list of zenve-skills the agent can invoke. Always include `zenve-memory` as the baseline so the agent has cross-run memory; add stack-specific skills on top. Examples: `zenve-memory, fastapi-setup, fastapi-monorepo-setup, fastapi-rules` for a backend developer.

If any input is ambiguous, show the user the choice with a one-line explanation of each option and proceed once they pick.

## 2. Resolve the destination

1. From the current working directory, look for `./.zenve/`.
2. If `./.zenve/` exists, the target is `./.zenve/agents/{slug}/`. Create `./.zenve/agents/` if missing.
3. If `./.zenve/` does **not** exist, ask the user: "I don't see a `.zenve/` folder here. Create one and scaffold the agent inside?" If yes, create `./.zenve/agents/` and proceed. If no, ask where to scaffold instead.
4. If `./.zenve/agents/{slug}/` already exists, **stop and ask** before overwriting any file. Do not silently clobber.

## 3. Create the agent directory and files

Create exactly these 5 files under `./.zenve/agents/{slug}/`. Do **not** create a `memory/` folder — the agent creates that at runtime. Do **not** create `PRODUCT.md` or `DESIGN.md` here — those are role-specific add-ons handled in step 5.

### `manifest.yaml`

```yaml
name: {agent_name}
slug: {slug}
description: {description}
adapter_type: claude_code
mode: {mode}
adapter_config:
  model: claude-sonnet-4-6
  max_tokens: 8096
skills:
{skills_yaml_list}
tools:
{tools_yaml_list}
heartbeat_interval_seconds: 0
```

Substitution rules:
- `{skills_yaml_list}` — render each skill as `  - skill-name`. If empty, render `[]` on the same line as `skills:` (i.e. `skills: []`).
- `{tools_yaml_list}` — render each tool as `  - ToolName`. Tools list must not be empty.

Example for a FastAPI developer agent:

```yaml
name: FastAPI Developer
slug: fastapi-dev
description: Builds and maintains FastAPI services — routes, models, migrations, tests.
adapter_type: claude_code
mode: code_pr
adapter_config:
  model: claude-sonnet-4-6
  max_tokens: 8096
skills:
  - zenve-memory
  - fastapi-setup
  - fastapi-monorepo-setup
  - fastapi-rules
tools:
  - Read
  - Write
  - Bash
heartbeat_interval_seconds: 0
```

### `SOUL.md`

Skeleton with section headings. The HTML comments are guidance — leave them in the file so a future editor knows what to write. Replace the `_TODO_` placeholders with role-specific content (or leave them and tell the user to fill them in).

```markdown
## Identity

You are **{agent_name}**, an AI agent operating inside the **{project_name}** project.

## Role

<!-- One short paragraph: what role does this agent play, what does it do, what quality bar does it hold? -->
You are a **{role}**. _TODO: describe what this agent builds, fixes, or produces, and the quality bar it holds itself to._

## Personality

<!-- 3–5 bullets, each with a bold one-word trait followed by an explanation. -->
- **Precise.** _TODO_
- **Conservative.** _TODO_
- **Structured.** _TODO_
- **Grounded.** _TODO_

## What you care about

<!-- 3–6 bullets of values the agent optimises for. Be specific to the role. -->
- _TODO_
- _TODO_
- _TODO_

## What you don't do

<!-- 3–6 bullets of explicit anti-patterns. Phrase as "Never X" or "Never Ys when Z." -->
- _TODO_
- _TODO_
- _TODO_
```

### `AGENTS.md`

Skeleton with the section structure used across existing agents. Headings stay; fill the body from the project context. If a section doesn't apply to this agent, delete the section rather than leaving it empty.

```markdown
# You are {agent_name}

You are part of the team that is working on {project_name}, your role is {role}.

## 1. Stack

<!-- Languages, frameworks, package managers, task runners, key libraries. List development commands the agent should know (e.g. `just dev`, `pnpm dev`, `pytest`). -->

_TODO_

## 2. Issue Intake

<!-- How does this agent receive work? What does an "issue" look like? Where does it look for assigned task files, plans, PRDs? What signals does it return when blocked or when an issue is malformed? -->

_TODO_

## 3. Project Structure

<!-- The repo / monorepo layout the agent works in. Directories, packages, dependency chains, where new files go. -->

_TODO_

## 4. Components & Layers

<!-- The role-specific layers: routes, services, models, utils for a backend dev; pages, components, store, lib for a frontend dev; PRDs, personas, backlog for a PM. Add a section per layer with location, rules, and violations to flag. -->

_TODO_

## 5. Conventions

<!-- Naming, formatting, testing, file organisation, commit / PR style. Anything that should be enforced during code review. -->

_TODO_

## 6. Out of Scope

<!-- What this agent must not do. Other agents that own those concerns. -->

_TODO_
```

### `RUN.md`

Generic baseline. **Leave `{agent_dir}` literal in the file** — the Zenve runtime resolves it per-invocation. Customize the path references (e.g. `docs/tasks/{domain}/`) to match this agent's role after scaffolding.

```markdown
# Run Instructions

## On Start

1. Load the `zenve-memory` skill — for memory conventions and lifecycle.

## Executing the Task

- Complete the task described by the user.
- If assigned an issue, read the issue title, description, and latest architect/planner comment.
- If the issue references a task file, read the task file first, then read its source plan and PRD for context.
- Implement only the task scope and respect its out-of-scope list.
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
```

### `HEARTBEAT.md`

Generic baseline. **Leave `{agent_name}` and `{agent_dir}` literal in the file** — the Zenve runtime resolves them per-invocation.

```markdown
# {agent_name} — Heartbeat

A heartbeat is an autonomous, timer-driven invocation — no caller prompt is provided.

## Tasks

On each tick, execute the following tasks in order:

<!-- No tasks defined yet. Add tasks here — each will run on every tick. -->

## On Each Tick

1. Read `{agent_dir}/memory/long_term.md` — load persisted context.
2. Check the Tasks list above.
3. If no tasks are defined, stop and signal `HEARTBEAT_OK: nothing to do`.
4. Otherwise, execute each task in order.
5. Update `{agent_dir}/memory/long_term.md` with results and observations.
6. Signal `HEARTBEAT_OK: <note>` summarising what was done.

## Before ending the session:

1. Update `{agent_dir}/memory/long_term.md` with any durable observations.
2. Clear `{agent_dir}/memory/scratch.md` or leave a brief summary for the next run.
3. Produce a final response that the gateway will store as the run result.

Here is an example of a final response:

```markdown
I have sent an email to nane@acme.com with all 
the sales leads in the last month.

HEARTBEAT_OK: Sales email send successfully to nane@acme.com.
```

## Signalling Outcomes

End each heartbeat run with one of these signals:

| Signal | Meaning |
|--------|---------|
| `HEARTBEAT_OK: nothing to do` | No tasks defined; tick skipped |
| `HEARTBEAT_OK: <note>` | Tasks completed; brief note of what was done |
| `HEARTBEAT_FAILED: <reason>` | Tick failed; needs attention |
| `HEARTBEAT_NEEDS_INPUT: <question>` | Blocked; cannot proceed autonomously |

## Constraints

- Heartbeat runs have a hard timeout.
- Do not start long-running processes that outlive the tick.
- Do not prompt for user input — you are running unattended.
```

## 4. Placeholder reference

Two kinds of placeholders. Get this right or the agent won't run correctly.

**Scaffold-time** — substitute the literal value when writing the file:

| Placeholder | Where | Example |
|---|---|---|
| `{agent_name}` | `manifest.yaml` (`name:` field) only | `FastAPI Developer` |
| `{slug}` | `manifest.yaml` (`slug:` field) | `fastapi-dev` |
| `{description}` | `manifest.yaml` (`description:` field) | `Builds and maintains FastAPI services …` |
| `{mode}` | `manifest.yaml` (`mode:` field) | `code_pr` |
| `{role}` | `SOUL.md` and `AGENTS.md` body text | `Python Developer` |

**Runtime** — leave the placeholder literal in the file; the Zenve gateway resolves it per-invocation:

| Placeholder | Where | Resolves to |
|---|---|---|
| `{agent_name}` | `SOUL.md`, `AGENTS.md`, `HEARTBEAT.md` | Display name from `manifest.yaml` |
| `{project_name}` | `SOUL.md`, `AGENTS.md` | Parent project name |
| `{agent_dir}` | `RUN.md`, `HEARTBEAT.md` | Path to the agent directory at runtime |

Note: `{agent_name}` appears in both tables — it is **substituted in `manifest.yaml`** (concrete display name) but **left literal everywhere else** (the gateway resolves it from the manifest at runtime). After writing, verify `SOUL.md`, `AGENTS.md`, `HEARTBEAT.md`, and `RUN.md` still contain the literal `{agent_name}` / `{project_name}` / `{agent_dir}` strings.

## 5. After scaffolding — tell the user

Print the created tree:

```
.zenve/agents/{slug}/
├── manifest.yaml
├── SOUL.md
├── AGENTS.md
├── RUN.md
└── HEARTBEAT.md
```

Then:

1. Tell the user the skeleton sections in `SOUL.md` and `AGENTS.md` still contain `_TODO_` placeholders, and offer to fill them in. The best reference is a sibling agent in `.zenve/agents/` that does similar work — read it first.
2. Ask whether the agent needs either of these role-specific add-ons:
   - **`PRODUCT.md`** — only for PM-style agents that own a product spec / PRD / backlog.
   - **`DESIGN.md`** — only for agents that produce UI and need a project-specific visual language.
   If yes, create the file in a follow-up step using a sibling agent (e.g. `pm/PRODUCT.md`, `react-dev/DESIGN.md`) as the reference for structure.
3. Remind them that `memory/long_term.md` and `memory/scratch.md` are created at runtime, not now.

## Notes

- Do not scaffold a `memory/` directory. The agent creates it on first run.
- Do not invent skills that don't exist — only reference skills that are installed in the project (look in `.claude/skills/` or `claude-skills.json`).
- The `RUN.md` and `HEARTBEAT.md` baselines above are generic. Existing agents in `zenve-agents/` customize phrasing and path references for their role; do the same for the new agent after scaffolding rather than at scaffold time.
