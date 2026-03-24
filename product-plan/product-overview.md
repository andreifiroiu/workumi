# Workumi — Product Overview

## Summary

Workumi is an AI-powered work orchestration platform for small service teams (2-10 people). It turns messy requests into structured deliverables, with AI agents handling drafts, analysis, and busywork while humans approve outcomes. Built for teams with limited staff and skill gaps who need to maintain quality without formal processes or specialist hires. A user should be able to define multiple organizations/teams and switch between them. Each organization will need a separate subscription and will have completely different settings and data.

## Planned Sections

1. **Today** — "What needs your brain right now" - approvals waiting, blockers, due today, what to do next
2. **Work** — Projects → Work Orders → Tasks → Deliverables. Includes inline: artifacts, comms threads, time entries
3. **Inbox** — Agent drafts awaiting review, approval requests, flagged items (risks, missing info)
4. **Playbooks** — SOPs & Checklists, templates (work order templates, doc templates), acceptance criteria library
5. **Directory** — Parties (clients, vendors, departments, stakeholders), team members & their skills
6. **Reports** — Project status rollups, workload & capacity, time & budget tracking
7. **Settings** — AI Agents (configuration, capacity, budgets), integrations, workspace settings
8. **UserMenu** — Organization switching, create new organization, organization settings, user profile, user logout

## Data Model

**Core Entities:**
- **Party** — Someone inside or outside the organization (client, vendor, department, team member)
- **Project** — A collection of work being done for a party
- **Work Order** — A specific unit of work within a project
- **Task** — Individual action items that make up a work order
- **Deliverable** — Output or artifact that gets delivered to a party
- **AI Agent** — A virtual team member with specific skills (dispatcher, PM copilot, copywriter, analyst, QA)
- **SOP** — A documented process template with checklists and acceptance criteria
- **Approval** — A request for human review and sign-off on agent-generated work
- **User** — Human team member who works in the system
- **TeamMember** — A team member (human or AI agent) that can be assigned to work
- **Communication Thread** — Conversation history tied to a specific work item
- **Message** — Individual message within a communication thread
- **Document** — Files, links, and evidence attached to work items

See `data-model/` for complete entity definitions and relationships.

## Design System

**Colors:**
- Primary: `indigo` (Tailwind color palette)
- Secondary: `emerald` (Tailwind color palette)
- Neutral: `slate` (Tailwind color palette)

**Typography:**
- Heading: Inter
- Body: Inter
- Mono: IBM Plex Mono

See `design-system/` for complete token definitions.

## Implementation Sequence

Build this product in milestones:

1. **Foundation** — Set up design tokens, data model types, routing structure, and application shell
2. **Today** — "What needs your brain right now" dashboard
3. **Work** — Projects, work orders, tasks, and deliverables management
4. **Inbox** — Agent drafts and approval requests
5. **Playbooks** — SOPs, checklists, and templates
6. **Directory** — Parties and team members
7. **Reports** — Project status, workload, and time tracking
8. **Settings** — AI agent configuration and workspace settings
9. **UserMenu** — Organization switching and user profile

Each milestone has a dedicated instruction document in `instructions/incremental/`.
