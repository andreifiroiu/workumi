## Define Section Variables

- **SECTION_NAME** = "Work management (projects, work orders, tasks)"
- **SECTION_ID** = "work"
- **NN** = "04"

---

I need you to implement the **[SECTION NAME]** section of Workumi, an AI-powered work orchestration platform.


## Context

I'm building Workumi incrementally, one section at a time. The foundation (project setup, design system, routing, and application shell) is already complete.

**What Workumi Does**: Turns messy work requests into structured deliverables with AI agents handling drafts while humans approve outcomes. Built for small service teams (2-10 people).

**Core Workflow**: Parties → Projects → Work Orders → Tasks → Deliverables

## This Section: [SECTION NAME]

**Purpose**: The Work section is the core work graph where all projects, work orders, tasks, and deliverables are managed. It provides multiple views (All Projects, My Work, By Status, Calendar, Archive) with an expandable tree navigation that lets users drill down through the hierarchy (Projects → Work Orders → Tasks → Deliverables) while also allowing detail pages for deeper focus.

## User Flows
- **Browse hierarchy** - User navigates through expandable tree (Projects → Work Orders → Tasks → Deliverables), expanding/collapsing items inline to reveal children
- **View details** - User clicks item to open full details page with all properties, related items, and side panel for comms thread
- **Switch views** - User switches between views using tabs at top (All Projects, My Work, By Status, Calendar, Archive), with quick access via collapsible submenus in left navigation panel
- **Create work items** - User quick-adds new project/work order/task inline (just title), then clicks to open and fill in full details
- **Track time** - User chooses between manual time entry, start/stop timer, or AI automatic estimation that suggests time based on activity patterns
- **Manage comms** - User views and adds to comms thread in persistent side panel when viewing project or work order details
- **Attach resources** - User attaches SOPs/checklists from Playbooks, links artifacts/deliverables, adds acceptance criteria
- **AI assistance** - Dispatcher creates work orders from requests, PM Copilot suggests task breakdowns, QA Agent validates against acceptance criteria

## UI Requirements
- Expandable tree structure showing Projects → Work Orders → Tasks → Deliverables hierarchy with expand/collapse controls
- Option to click any item to open dedicated details page with full information
- Tab navigation at top for switching between views: All Projects, My Work, By Status (Kanban), Calendar, Archive
- Collapsible submenus in left navigation panel for quick view switching
- Quick-add inline forms (title only) with option to open full detail form for complete configuration
- Persistent side panel for comms thread when viewing project or work order details
- Time tracking options: manual entry fields, start/stop timer widget, and AI estimation suggestions
- Status badges and progress indicators throughout (project status, work order status, task status)
- Priority labels (Low, Medium, High, Urgent) with visual coding
- Budget and time tracking displays (estimated vs. actual hours)
- Artifact/deliverable attachments with version history
- Dependencies and blockers clearly indicated
- AI-generated suggestions highlighted (task breakdowns, work orders from requests, validation results)
- Search and filter controls for each view
- Default to user's last-used view on entry
- Empty states with helpful prompts for creating first project/work order


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

