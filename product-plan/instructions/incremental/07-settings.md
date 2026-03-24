## Define Section Variables

- **SECTION_NAME** = "Settings"
- **SECTION_ID** = "settings"
- **NN** = "07"

---

I need you to implement the **[SECTION NAME]** section of Workumi, an AI-powered work orchestration platform.


## Context

I'm building Workumi incrementally, one section at a time. The foundation (project setup, design system, routing, and application shell) is already complete.

**What Workumi Does**: Turns messy work requests into structured deliverables with AI agents handling drafts while humans approve outcomes. Built for small service teams (2-10 people).

**Core Workflow**: Parties → Projects → Work Orders → Tasks → Deliverables

## This Section: [SECTION NAME]

**Purpose**: Administrative hub for configuring workspace settings, managing team access, controlling AI agent behavior and budgets, connecting integrations, and reviewing audit logs. Organized into 7 subsections accessible via sidebar navigation for all configuration tasks that don't require daily attention.

## User Flows
- **Navigate settings** - User uses sidebar navigation to switch between Workspace, Team & Permissions, AI Agents, Integrations, Billing, Notifications, and Audit Log subsections
- **Configure workspace** - User updates workspace name, timezone, defaults, and branding settings
- **Manage team** - User invites team members, assigns roles, and manages access permissions
- **Configure AI agents** - User views list of all AI agents, expands an agent to see Config/Activity/Budget tabs, toggles enabled/disabled, sets run limits, budget caps, permissions, and behavior settings
- **Set global AI budgets** - User configures total AI budget for workspace, per-project budget caps, and approval requirements
- **View agent activity** - User reviews agent run history with inputs, outputs, costs, approval/rejection history, and error logs
- **Connect integrations** - User adds and configures email, calendar, Slack, accounting, and other third-party integrations
- **Manage billing** - User views plan details, usage metrics, and invoices
- **Configure notifications** - User sets email and push notification preferences
- **Review audit log** - User searches and filters full activity history for compliance
- **Transfer ownership** - User transfers ownership of their organization to another user
- **Export all data** - User can export all the data from their organization
- **Delete organization** - USer can delete the organization completely. The operation is not reversible. All team members will loose access

## UI Requirements
- Sidebar navigation with 7 subsections: Workspace, Team & Permissions, AI Agents, Integrations, Billing, Notifications, Audit Log
- Each subsection displays in main content area when selected
- AI Agents subsection shows list/table of all agents with status indicators (enabled/disabled)
- Click agent to expand inline and reveal tabs: Config, Activity, Budget
- Config tab: Toggle switches for enabled/disabled, input fields for run limits and budget caps, permission checkboxes, behavior setting controls
- Activity tab: Table/list of agent runs showing timestamp, inputs, outputs, cost, approval status, errors
- Budget tab: Current spend vs cap, usage charts, cost breakdown
- Global AI settings panel: Total workspace budget, per-project caps, approval requirement toggles
- Form inputs for workspace settings (name, timezone, defaults, branding)
- Team table with invite button, role dropdowns, action buttons (edit, remove)
- Integration cards showing connected status with connect/disconnect buttons
- Billing displays plan info, usage metrics, invoice list with download links
- Notification preferences organized by category with toggle switches
- Audit log with search, date filters, action type filters, exportable table
- Save/Cancel buttons for form sections
- Success/error toast notifications for actions
- Confirmation dialogs for destructive actions (disable agent, remove team member)


**Files Provided**:
- `sections/[section-id]/README.md` - Complete specification
- `sections/[section-id]/components/` - React components (reference implementation)
- `sections/[section-id]/types.ts` - TypeScript interfaces
- `sections/[section-id]/sample-data.json` - Sample data for development
- `sections/[section-id]/tests.md` - Test specifications
- `instructions/incremental/[NN]-[section-id].md` - Step-by-step implementation guide

## Before You Start - Questions for Me

1. **Data Source**: Should I use mock data from `sample-data.json` or connect to an API?
2. **State Management**: Should I use React Query for server state? Local state only?
3. **Forms**: Should I use React Hook Form + Zod for validation?
4. **Modals/Drawers**: Should I use a library (Radix UI, Headless UI) or build custom?

## Implementation Requirements

### Design System (Already Set Up)

- **Colors**: Indigo (primary), Emerald (secondary), Slate (neutral)
- **Typography**: Inter (headings/body), IBM Plex Mono (code)
- **Tailwind CSS v4**: Use built-in utilities, avoid custom CSS
- **Dark Mode**: Support light and dark using `dark:` variants
- **Responsive**: Mobile-first with sm: (768px) and lg: (1024px) breakpoints

### Component Patterns

1. **Props-Based**: All data via props, no direct data imports
2. **No Navigation**: Don't include nav chrome, shell handles routing
3. **Empty States**: Show helpful messages when no data exists
4. **Loading States**: Show skeletons or spinners during data fetch
5. **Error States**: Handle failures gracefully with retry options
6. **TypeScript**: Use types from `sections/[section-id]/types.ts`

### Integration with Shell

The section will be rendered inside `<AppShell>` like this:

```tsx
<AppShell navigationItems={...} user={...}>
  <[SectionName]Page />
</AppShell>
```

Your section should render in the main content area (no shell or nav needed).

## What to Implement

Please review the detailed specification and implement:

1. **Main Page Component**: The top-level component for this section
2. **Sub-Components**: All components listed in `components/` directory
3. **State Management**: Handle data fetching, mutations, and local state
4. **User Interactions**: All buttons, forms, and actions from the spec
5. **Responsive Layout**: Adapt UI for mobile, tablet, and desktop
6. **Empty States**: What users see when no data exists
7. **Loading States**: Feedback during async operations
8. **Error Handling**: Graceful failures with retry/fallback

## Testing Requirements

Implement tests as specified in `sections/[section-id]/tests.md`:

- [ ] Component rendering with various props
- [ ] Complete user flows (end-to-end workflows)
- [ ] Empty state handling (no data scenarios)
- [ ] Error states (API failures, validation errors)
- [ ] Edge cases (boundary values, unusual inputs)
- [ ] Responsive behavior (mobile/tablet/desktop)

## Example: Implementing the "Today" Section

If implementing the Today section:

```typescript
// app/today/page.tsx
import { TodayView } from '@/sections/today/components'
import { useTodayData } from '@/lib/hooks'

export default function TodayPage() {
  const {
    dailySummary,
    approvals,
    tasks,
    blockers,
    upcomingDeadlines,
    activities,
    metrics,
    isLoading
  } = useTodayData()

  if (isLoading) {
    return <TodayLoadingSkeleton />
  }

  return (
    <TodayView
      dailySummary={dailySummary}
      approvals={approvals}
      tasks={tasks}
      blockers={blockers}
      upcomingDeadlines={upcomingDeadlines}
      activities={activities}
      metrics={metrics}
      onViewApproval={(id) => console.log('View approval:', id)}
      onApprove={(id) => console.log('Approve:', id)}
      onReject={(id) => console.log('Reject:', id)}
      // ... other callbacks
    />
  )
}
```

## What Success Looks Like

When complete, I should be able to:

1. Navigate to this section from the sidebar
2. See all UI elements from the specification
3. Interact with all buttons, forms, and actions
4. View the section on mobile, tablet, and desktop
5. See appropriate messages when data is empty
6. See loading indicators during data operations
7. See error messages when operations fail
8. Complete all user flows described in the spec

## Steps to Implement

1. **Review the Spec**: Read `sections/[section-id]/README.md` thoroughly
2. **Study Sample Data**: Understand data structure in `sample-data.json`
3. **Check Types**: Review TypeScript interfaces in `types.ts`
4. **Reference Components**: Look at existing components in `components/`
5. **Follow Instructions**: Use `instructions/incremental/[NN]-[section-id].md` as your guide
6. **Write Tests**: Implement tests from `tests.md`
7. **Manual Test**: Verify all user flows work end-to-end

## Additional Notes

- Use the exact button labels and UI text from the specification
- Follow the test cases for expected behaviors and edge cases
- Implement graceful empty states (helpful messages, call-to-action buttons)
- Support both success and failure paths for all actions
- Ensure dark mode works for all UI elements
- Make interactive elements keyboard-accessible

## Files Available

I'm providing:
- Section specification (README.md)
- Reference components (components/)
- TypeScript types (types.ts)
- Sample data for testing (sample-data.json)
- Test specifications (tests.md)
- Implementation instructions (instructions/incremental/[NN]-[section-id].md)

Please answer the clarifying questions above, then I'll provide the files and we can begin implementing the **[SECTION NAME]** section!

