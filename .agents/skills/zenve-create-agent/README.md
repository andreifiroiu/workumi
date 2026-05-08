# zenve-create-agent

Claude Code skill that scaffolds a new Zenve agent — `manifest.yaml` plus the four required documents (`SOUL`, `AGENTS`, `RUN`, `HEARTBEAT`) — under `.zenve/agents/{slug}/`.

## Install

```bash
npx skills add zenve-ai/zenve-skills --skill zenve-create-agent
```

## Usage

Inside a Zenve project (one with a `.zenve/` folder), just tell Claude:

> "create a new zenve agent called fastapi-dev"
> "scaffold a zenve agent for product management"
> "add a new agent in .zenve"

The skill will ask for the agent's display name, slug, mode (`code_pr` or `artifact_pr`), tools, and skills, then write the agent directory.

## What gets generated

```
.zenve/agents/{slug}/
├── manifest.yaml     # name, slug, mode, model, skills, tools
├── SOUL.md           # identity, role, personality, values
├── AGENTS.md         # stack, intake, project structure, conventions
├── RUN.md            # task-driven run instructions + outcome signals
└── HEARTBEAT.md      # autonomous tick instructions + outcome signals
```

`memory/long_term.md` and `memory/scratch.md` are intentionally **not** scaffolded — the agent creates them on first run.

`PRODUCT.md` (PM-style agents) and `DESIGN.md` (UI-producing agents) are intentionally **not** scaffolded — they are role-specific add-ons. The skill prompts the user after scaffolding and creates them as a follow-up step using sibling agents as reference.

## After scaffolding

`SOUL.md` and `AGENTS.md` ship with `_TODO_` placeholders. Open them and fill in the role-specific detail — the cleanest reference is a sibling agent in `.zenve/agents/` that does similar work.
