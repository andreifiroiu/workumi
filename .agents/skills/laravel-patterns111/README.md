# laravel-patterns

Claude Code skill that defines Laravel patterns and best practices for both development and auditing. Loaded by dev agents when implementing features and by review agents when auditing code.

## Install

```bash
npx skills add zenve-ai/zenve-registry/skills --skill laravel-patterns111
```

## Usage

**When developing:**

> "add a new page"
> "add a new component"
> "add a new store domain"
> "implement this feature"

**When auditing:**

> "review my code"
> "check architecture"
> "audit this laravel project"
> "does this follow the laravel rules"
> "review my backend structure"

## What it covers

**Stack** — Laravel 13 + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui + Inertia.js + React

**Design Style** — reads `CLAUDE.md` design section; falls back to shadcn/ui defaults
