# Workumi - One-Shot Implementation Prompt

I need you to implement Workumi, an AI-powered work orchestration platform for small service teams.

## About This Project

Workumi turns messy requests into structured deliverables, with AI agents handling drafts, analysis, and busywork while humans approve outcomes. It's designed for teams of 2-10 people who need to maintain quality without formal processes or specialist hires.

**Core Workflow**: Parties → Projects → Work Orders → Tasks → Deliverables
**Key Feature**: Human-in-the-loop approvals - AI agents generate drafts but only humans can deliver work to clients

## What You'll Build

A complete web application with:

1. **Application Shell** - Sidebar navigation, user menu, organization switching
2. **8 Feature Sections**:
   - **Today** - Daily command center with approvals, tasks, blockers, activity feed
   - **Work** - Project tree with work orders, tasks, deliverables, time tracking
   - **Inbox** - Agent drafts and approval requests awaiting review
   - **Playbooks** - SOPs, checklists, templates, acceptance criteria
   - **Directory** - Parties, contacts, and team member management
   - **Reports** - Project health, workload, budgets, AI insights
   - **Settings** - Workspace config, AI agents, integrations, billing
   - **User Menu** - Profile and multi-organization management

## Before You Start - Ask Me These Questions

Before implementing, please ask me to clarify:

1. **Framework Choice**: Should I use Next.js (App Router), Vite + React, or Remix?
2. **Backend Approach**: Should I create API routes, or mock the backend for now?
3. **Authentication**: Should I implement NextAuth/Clerk, or use mock authentication?
4. **Database**: Should I set up Prisma + PostgreSQL, or use mock data?
5. **AI Integration**: Should I integrate OpenAI API for agents, or mock AI responses?
6. **State Management**: Should I use React Query, Zustand, or Context API?
7. **Testing**: Should I include test files (Vitest/Jest)?

## Complete Instructions

I've attached the complete implementation instructions. Please review:
- `instructions/one-shot-instructions.md` - Contains all milestones combined
- `product-overview.md` - Product vision and features
- `design-system/` - Colors, fonts, and design tokens
- `data-model/` - All TypeScript types and sample data
- `shell/` - Application shell components
- `sections/*/` - Each section's components, types, and test specs

## Implementation Requirements

### Design System

- **Colors**: Indigo (primary), Emerald (secondary), Slate (neutral)
- **Typography**: Inter (headings/body), IBM Plex Mono (code)
- **Tailwind CSS v4**: Use built-in utilities, no custom CSS
- **Dark Mode**: Support both light and dark themes using `dark:` variants
- **Responsive**: Mobile-first with breakpoints at 768px (tablet) and 1024px (desktop)

### Key Architectural Decisions

1. **Props-Based Components**: All data via props, no direct imports
2. **No Navigation in Sections**: Shell handles all routing
3. **Mock Data First**: Use sample data from `data-model/sample-data.json` initially
4. **TypeScript Strict**: Use types from `data-model/types.ts`
5. **Component Structure**: Follow the patterns in `sections/*/components/`

### Implementation Order

Please implement in this order:

1. **Foundation** (Milestone 1):
   - Set up project with Tailwind v4
   - Import design tokens
   - Copy data model types
   - Set up routing for all sections
   - Implement application shell

2. **Today Section** (Milestone 3):
   - Daily summary card
   - Approvals queue
   - Tasks due today
   - Blockers list
   - Upcoming deadlines
   - Activity feed
   - Quick capture input

3. **Work Section** (Milestone 4):
   - Project tree view
   - Work order cards
   - Task list with checklists
   - Deliverables view
   - Time tracking
   - Communication threads
   - Document attachments

4. **Inbox Section** (Milestone 5):
   - Tabbed interface
   - Inbox item list
   - Detail side panel
   - Approve/reject actions
   - Bulk selection

5. **Playbooks Section** (Milestone 6):
   - Four tabs (SOPs, Checklists, Templates, Acceptance Criteria)
   - Playbook cards
   - Detail views
   - Create/edit forms
   - Usage history

6. **Directory Section** (Milestone 7):
   - Three tabs (Parties, Contacts, Team)
   - Entity cards/list
   - Detail views
   - Create/edit forms
   - Skill management for team

7. **Reports Section** (Milestone 8):
   - Project status dashboard
   - Workload charts
   - Time/budget tracking
   - AI insights
   - Export capabilities

8. **Settings Section** (Milestone 9):
   - Tabbed settings interface
   - Workspace configuration
   - Team management
   - AI agent config
   - Integrations
   - Billing interface
   - Audit log

9. **User Menu** (Milestone 10):
   - Profile page
   - Organization create/switch
   - Notification preferences
   - Appearance settings
   - Security settings

### Testing Requirements

For each section, implement tests as specified in `sections/*/tests.md`:

- Component rendering tests
- User flow tests (complete workflows)
- Empty state tests (no data scenarios)
- Error state tests (failures, validation)
- Edge case tests (boundary conditions)

## Multi-Organization Support

Each user can belong to multiple organizations:

- **Separate per organization**: subscription, settings, data, team, AI budgets, integrations
- **Shared across organizations**: user profile, appearance, notifications
- **Organization switching**: Changes context without page reload, keeps user on same page type

## What Success Looks Like

When complete, I should be able to:

1. Navigate between all sections using the sidebar
2. See the daily summary and approvals queue in Today
3. View the project tree and drill into work orders in Work
4. Review agent drafts and approve/reject them in Inbox
5. Browse and create playbooks (SOPs, checklists, etc.)
6. Manage parties, contacts, and team members in Directory
7. View project health and workload reports
8. Configure workspace settings and AI agents
9. Switch between organizations in the user menu
10. Use the application in both light and dark mode
11. View the application responsively on mobile, tablet, and desktop

## Additional Notes

- Use the exact button labels, UI text, and flows from the section specifications
- Follow the test cases in `tests.md` files for expected behaviors
- Implement empty states gracefully (show helpful messages, not errors)
- Handle loading states (show skeletons or spinners during data fetch)
- Support both success and failure paths for all user actions

## Files Provided

I'm providing you with:
- Product overview and vision
- Complete design system (colors, fonts, tokens)
- Data model with TypeScript types and sample data
- Application shell components (AppShell, MainNav, UserMenu)
- Section components for each of the 8 sections
- Detailed implementation instructions
- Test specifications for TDD

Please let me know your tech stack decisions, then I'll provide the implementation instructions and we can begin building Workumi!
