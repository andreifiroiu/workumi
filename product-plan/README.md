# Workumi - Product Design Export

This package contains the complete product design for Workumi, an AI-powered work orchestration platform for small service teams.

## What's Inside

This export includes everything needed to implement Workumi:

- **Product Overview** - Vision, problems/solutions, key features
- **Design System** - Colors (indigo/emerald/slate), typography (Inter/IBM Plex Mono), design tokens
- **Data Model** - All entities, relationships, and TypeScript types
- **Application Shell** - Navigation, user menu, organization switching
- **Section Designs** - 8 fully-designed sections with components and props
- **Implementation Instructions** - Step-by-step guides for each milestone
- **Ready-to-Use Prompts** - Copy/paste prompts for coding agents
- **Test Specifications** - TDD instructions for each section

## Quick Start

### For AI Coding Agents

1. **One-Shot Implementation** (build everything at once):
   - Copy `prompts/one-shot-prompt.md` into your coding agent
   - Provide the implementation instructions from `instructions/one-shot-instructions.md`
   - Let the agent build the complete application

2. **Incremental Implementation** (milestone by milestone):
   - Use `prompts/section-prompt.md` as a template
   - Start with `instructions/incremental/01-foundation.md`
   - Progress through each milestone (02-shell, 03-today, etc.)

### For Human Developers

1. **Review the Product**:
   - Read `product-overview.md` to understand the vision
   - Explore `data-model/README.md` for entities and relationships
   - Review `design-system/` for colors, fonts, and tokens

2. **Set Up Your Project**:
   - Choose your tech stack (see Tech Stack Decisions below)
   - Install Tailwind CSS v4
   - Import Google Fonts (Inter + IBM Plex Mono)
   - Set up design tokens from `design-system/tokens.css`

3. **Implement Incrementally**:
   - Follow `instructions/incremental/01-foundation.md` first
   - Build the shell (`instructions/incremental/02-shell.md`)
   - Implement sections one by one (Today, Work, Inbox, etc.)
   - Use the test specifications in each section's `tests.md`

## Directory Structure

```
product-plan/
├── README.md                       # This file
├── product-overview.md             # Product description and vision
│
├── design-system/                  # Visual design tokens
│   ├── tokens.css                  # Tailwind v4 design tokens
│   ├── tailwind-colors.md          # Color palette guide
│   └── fonts.md                    # Typography guide
│
├── data-model/                     # Data structure
│   ├── README.md                   # Entity descriptions
│   ├── types.ts                    # TypeScript interfaces
│   └── sample-data.json            # Example data for all types
│
├── shell/                          # Application shell
│   ├── README.md                   # Shell documentation
│   └── components/                 # Shell React components
│       ├── AppShell.tsx
│       ├── MainNav.tsx
│       ├── UserMenu.tsx
│       └── index.ts
│
├── sections/                       # Feature sections
│   ├── today/                      # Daily command center
│   ├── work/                       # Projects → Work Orders → Tasks
│   ├── inbox/                      # Agent drafts & approvals
│   ├── playbooks/                  # SOPs & templates
│   ├── directory/                  # Parties, contacts, team
│   ├── reports/                    # Analytics & insights
│   ├── settings/                   # Workspace configuration
│   └── usermenu/                   # User profile & orgs
│       ├── README.md               # Section specification
│       ├── components/             # React components
│       ├── types.ts                # TypeScript types
│       ├── sample-data.json        # Sample data
│       └── tests.md                # Test specifications
│
├── prompts/                        # Ready-to-use prompts
│   ├── one-shot-prompt.md          # Full implementation prompt
│   └── section-prompt.md           # Template for sections
│
└── instructions/                   # Implementation guides
    ├── one-shot-instructions.md    # All milestones combined
    └── incremental/                # Step-by-step guides
        ├── 01-foundation.md
        ├── 02-shell.md
        ├── 03-today.md
        ├── 04-work.md
        ├── 05-inbox.md
        ├── 06-playbooks.md
        ├── 07-directory.md
        ├── 08-reports.md
        └── 09-settings.md
```

## Tech Stack Decisions

Before implementing, you'll need to make these choices:

### Framework
- **Next.js 14+ (App Router)** - Recommended for full-stack
- **Vite + React** - Good for SPA
- **Remix** - Alternative full-stack option

### State Management
- **React Query / TanStack Query** - Recommended for server state
- **Zustand** - Good for client state
- **Context API** - Sufficient for simple apps

### Backend
- **Next.js API Routes** - If using Next.js
- **Express + Node.js** - Traditional REST API
- **tRPC** - Type-safe API layer
- **GraphQL** - If you prefer GraphQL

### Database
- **PostgreSQL** - Recommended (relational data model)
- **MongoDB** - If you prefer document store
- **Supabase** - Postgres with auth built-in
- **PlanetScale** - MySQL-compatible serverless

### Authentication
- **NextAuth.js** - If using Next.js
- **Supabase Auth** - If using Supabase
- **Clerk** - Turnkey auth solution
- **Auth0** - Enterprise option

### AI Integration
- **OpenAI API** - For AI agents
- **Anthropic Claude** - Alternative AI provider
- **Vercel AI SDK** - Simplifies AI integration

## Product Sections

### 1. Today (Daily Command Center)
**Purpose**: Answer "what needs my attention right now?" at a glance

**Features:**
- PM Copilot daily summary
- Approvals queue with badges
- Tasks due today (sorted by priority)
- Blockers requiring action
- Upcoming deadlines (next 7 days)
- Recent activity feed
- Quick capture for requests/notes/tasks

### 2. Work (Project Management)
**Purpose**: Organize work from parties → projects → work orders → tasks → deliverables

**Features:**
- Hierarchical project tree view
- Work order kanban/list views
- Task management with checklists
- Deliverable tracking
- Time tracking (manual/timer/AI)
- Communication threads
- Document attachments
- SOP application

### 3. Inbox (Review Queue)
**Purpose**: Process agent-generated drafts and approval requests

**Features:**
- Tabbed interface (All, Agent Drafts, Approvals, Flagged, Mentions)
- Side panel for item details
- Approve/reject with feedback
- Edit before approving
- Defer for later
- Bulk actions
- AI confidence scores
- QA validation indicators

### 4. Playbooks (Knowledge Base)
**Purpose**: SOPs, checklists, templates, and acceptance criteria library

**Features:**
- Tabbed by type (SOPs, Checklists, Templates, Acceptance Criteria)
- Create, edit, duplicate playbooks
- Apply to work orders
- Version history
- Usage tracking
- AI-generated templates

### 5. Directory (Parties & Team)
**Purpose**: Manage external parties, contacts, and internal team members

**Features:**
- Three tabs: Parties, Contacts, Team
- Party management (clients, vendors, partners, departments)
- Contact details with engagement types
- Team member skill inventories
- Capacity and workload tracking
- Linked projects view

### 6. Reports (Analytics Dashboard)
**Purpose**: Project health, workload, time/budget tracking, and AI insights

**Features:**
- Project status rollups with health scores
- Workload reports by team member
- Task aging reports (stuck tasks)
- Blocker reports with impact
- Time & budget tracking
- Approvals velocity
- Agent activity reports
- AI-generated insights

### 7. Settings (Workspace Configuration)
**Purpose**: Configure workspace, team, AI agents, integrations, billing

**Features:**
- Workspace settings (timezone, branding, defaults)
- Team management (invites, roles, permissions)
- AI agent configuration (limits, budgets, permissions)
- Integration management
- Billing & invoices
- Notification preferences
- Audit log

### 8. User Menu (Profile & Organizations)
**Purpose**: User profile, organization switching, account settings

**Features:**
- User profile management
- Organization switcher with plan badges
- Create new organization
- Multi-organization support (separate workspaces)
- Notification preferences
- Appearance settings (theme, density, start page)
- Security (sessions, connected apps, API keys)
- Help & support links

## Design System

### Colors

**Primary (Indigo)**: Actions, links, active states
- Main: `indigo-600`
- Hover: `indigo-700`
- Active: `indigo-800`

**Secondary (Emerald)**: Success states, positive actions
- Main: `emerald-600`
- Hover: `emerald-700`

**Neutral (Slate)**: Text, backgrounds, borders
- Page BG: `slate-50` / `slate-900` (dark)
- Card BG: `white` / `slate-800` (dark)
- Text: `slate-600` / `slate-300` (dark)
- Borders: `slate-200` / `slate-700` (dark)

### Typography

**Heading & Body**: Inter (400, 500, 600, 700)
**Monospace**: IBM Plex Mono (400, 500)

### Key Principles

- **Mobile Responsive**: Use Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`)
- **Dark Mode**: Support light and dark themes using `dark:` variants
- **Props-Based Components**: All data via props, no direct imports
- **No Navigation in Sections**: Shell handles all navigation

## Implementation Order

### Milestone 1: Foundation (Week 1)
- Set up project with Tailwind v4
- Import design tokens and fonts
- Implement data model types
- Set up routing
- Build application shell

### Milestone 2-9: Sections (Weeks 2-9)
- Implement one section per week
- Start with Today (simplest)
- Build Work section (most complex) in middle
- End with Settings and User Menu

## Testing Strategy

Each section includes `tests.md` with:

- **UI Component Tests**: Verify rendering with props
- **User Flow Tests**: Test complete workflows
- **Empty State Tests**: Handle missing data gracefully
- **Error State Tests**: Test failure scenarios
- **Edge Case Tests**: Boundary conditions and limits
- **Integration Tests**: Test section with shell

Use your preferred testing framework:
- **Vitest** + React Testing Library (recommended)
- **Jest** + React Testing Library
- **Playwright** for E2E tests

## Multi-Organization Architecture

Workumi supports multiple organizations per user:

- Each organization has **completely separate**:
  - Subscription plan and billing
  - Workspace settings
  - Team members and permissions
  - Projects, work orders, tasks
  - AI agent budgets and configurations
  - Integration connections

- User's **global settings** (persist across orgs):
  - Profile information
  - Appearance preferences
  - Notification preferences

- **Organization Switching**:
  - Keeps user on same page type (Today→Today, Work→Work)
  - Changes entire data context
  - No page reload required

## Key Features to Implement

### Human-in-the-Loop Approvals
- AI agents generate drafts but cannot deliver
- All agent outputs require human approval
- Approve, reject with feedback, or edit before approving

### Work Graph Structure
Parties → Projects → Work Orders → Tasks → Deliverables

### SOP-Driven Workflows
- Attach SOPs to work orders for guidance
- AI agents follow SOP steps
- Checklists with evidence requirements

### AI Agent Permissions
- Configurable permission boundaries
- Budget caps per agent
- Run limits (daily, weekly, monthly)
- Approval requirements for sensitive actions

### Time Tracking Modes
- **Manual**: User logs hours
- **Timer**: Start/stop timer per task
- **AI Estimation**: Agent suggests hours based on scope

## Getting Help

- Review the section READMEs for detailed specs
- Check `tests.md` files for expected behaviors
- Use sample data in `sample-data.json` for testing
- Refer to design system docs for styling guidance

## License

This design package is provided for implementation of the Workumi platform.

---

**Generated by Design OS** | January 2026
