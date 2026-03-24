# Task Breakdown: My Work View Improvements

## Overview
Total Tasks: 30 (across 5 task groups)

This feature enhances the "My Work" subsection of the Work page to provide RACI-aware filtering, subtab navigation (Tasks, Work Orders, Projects, All), summary metrics, and visual hierarchy based on RACI roles.

## Task List

### Backend Layer

#### Task Group 1: Backend Query Extensions and Data Preparation
**Dependencies:** None

- [x] 1.0 Complete backend RACI query layer
  - [x] 1.1 Write 4-6 focused tests for RACI scope methods
    - Test `scopeWhereUserHasRaciRole` on Project model
    - Test `scopeWhereUserHasRaciRole` on WorkOrder model
    - Test filtering by specific RACI role type
    - Test exclusion of "Informed" items when flag is set
  - [x] 1.2 Add RACI query scope methods to Project model
    - Add `scopeWhereUserHasRaciRole($query, int $userId, bool $excludeInformed = true)`
    - Add `scopeWhereUserIsAccountable($query, int $userId)`
    - Add `scopeWhereUserIsResponsible($query, int $userId)`
    - File: `/Users/andreifiroiu/Dev/ValetSites/workumi/app/Models/Project.php`
  - [x] 1.3 Add RACI query scope methods to WorkOrder model
    - Add `scopeWhereUserHasRaciRole($query, int $userId, bool $excludeInformed = true)`
    - Add `scopeWhereUserIsAccountable($query, int $userId)`
    - Add `scopeWhereUserIsResponsible($query, int $userId)`
    - Add `scopeInReviewWhereUserIsAccountable($query, int $userId)` for "awaiting review" metric
    - File: `/Users/andreifiroiu/Dev/ValetSites/workumi/app/Models/WorkOrder.php`
  - [x] 1.4 Add helper method to get user RACI roles for an item
    - Add `getUserRaciRoles(int $userId): array` to Project model
    - Add `getUserRaciRoles(int $userId): array` to WorkOrder model
    - Returns array like `['accountable', 'consulted']` for a given user
  - [x] 1.5 Ensure RACI scope tests pass
    - Run ONLY the 4-6 tests written in 1.1
    - Verify query scopes return correct items

**Acceptance Criteria:**
- The 4-6 tests written in 1.1 pass
- RACI scope methods correctly filter projects and work orders
- Consulted and Informed array fields are properly queried
- Informed items can be excluded from results

---

#### Task Group 2: API Layer and Controller Updates
**Dependencies:** Task Group 1

- [x] 2.0 Complete API layer for My Work data
  - [x] 2.1 Write 4-6 focused tests for My Work API endpoint
    - Test my work data returns projects with user RACI roles
    - Test my work data returns work orders with user RACI roles
    - Test my work data returns tasks assigned to user
    - Test summary metrics calculations are correct
    - Test "show informed" toggle affects returned data
  - [x] 2.2 Create dedicated method for My Work data in WorkController
    - Add `getMyWorkData(User $user, Team $team, bool $showInformed = false): array`
    - Include projects, work orders, and tasks with RACI role data
    - Include computed RACI roles for each item
    - File: `/Users/andreifiroiu/Dev/ValetSites/workumi/app/Http/Controllers/Work/WorkController.php`
  - [x] 2.3 Add summary metrics calculation method
    - Add `getMyWorkMetrics(User $user, Team $team): array`
    - Calculate: accountable count, responsible count, awaiting review count, assigned tasks count
    - Return structured metrics array for frontend consumption
  - [x] 2.4 Update index method to pass My Work specific data
    - Add `myWorkData` to Inertia props when view is `my_work`
    - Add `myWorkMetrics` to Inertia props
    - Add new user preference: `my_work_subtab` (default: 'tasks')
    - Add new user preference: `my_work_show_informed` (default: false)
  - [x] 2.5 Add endpoint for updating My Work preferences
    - Handle `my_work_subtab` preference updates
    - Handle `my_work_show_informed` preference updates
    - Use existing `updatePreference` pattern
  - [x] 2.6 Ensure API layer tests pass
    - Run ONLY the 4-6 tests written in 2.1
    - Verify data structure matches frontend expectations

**Acceptance Criteria:**
- The 4-6 tests written in 2.1 pass
- My Work data includes RACI role information for each item
- Summary metrics are calculated correctly
- User preferences are persisted and retrieved properly

---

### Frontend Layer

#### Task Group 3: UI Components
**Dependencies:** Task Group 2 (COMPLETED)

- [x] 3.0 Complete UI components for My Work improvements
  - [x] 3.1 Write 4-6 focused tests for new UI components
    - Test RaciBadge renders correct color and label for each role
    - Test MyWorkSubtabs component handles tab switching
    - Test MyWorkFilters component applies filters correctly
    - Test MyWorkTreeView renders hierarchical structure
  - [x] 3.2 Create RaciBadge component
    - File: `/Users/andreifiroiu/Dev/ValetSites/workumi/resources/js/components/work/raci-badge.tsx`
    - Follow StatusBadge pattern from `/Users/andreifiroiu/Dev/ValetSites/workumi/resources/js/components/work/status-badge.tsx`
    - Implement color scheme:
      - Accountable: Purple/violet (`bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400`)
      - Responsible: Blue/indigo (`bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400`)
      - Consulted: Amber (`bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400`)
      - Informed: Slate/gray (`bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500`)
    - Display abbreviations: "A", "R", "C", "I"
    - Add tooltip with full role name on hover
    - Support multiple badges display (ordered by prominence)
  - [x] 3.3 Create MyWorkSubtabs component
    - File: `/Users/andreifiroiu/Dev/ValetSites/workumi/resources/js/components/work/my-work-subtabs.tsx`
    - Tabs: Tasks (default), Work Orders, Projects, All
    - Styled to appear nested below main view tabs
    - Handle tab change callback to parent
    - Persist selection via user preference
  - [x] 3.4 Create MyWorkFilters component
    - File: `/Users/andreifiroiu/Dev/ValetSites/workumi/resources/js/components/work/my-work-filters.tsx`
    - RACI role multi-select filter (Accountable, Responsible, Consulted, Informed)
    - Status filter (dynamic based on active subtab)
    - Due date range filter (This week, Next 7 days, Next 30 days, Overdue, Custom)
    - Sort selector (Due date, Priority, Recently updated, Alphabetical)
    - Sort direction toggle
    - "Clear all" button
    - "Show Informed" toggle switch
  - [x] 3.5 Create MyWorkMetrics component
    - File: `/Users/andreifiroiu/Dev/ValetSites/workumi/resources/js/components/work/my-work-metrics.tsx`
    - Reuse existing StatCard pattern from my-work-view.tsx
    - Display: Accountable items count, Responsible items count, Awaiting review count, Assigned tasks count
    - Make metrics clickable to apply corresponding filter
    - Use appropriate colors for each metric
  - [x] 3.6 Create MyWorkTreeView component for "All" subtab
    - File: `/Users/andreifiroiu/Dev/ValetSites/workumi/resources/js/components/work/my-work-tree-view.tsx`
    - Follow ProjectTreeItem pattern from `/Users/andreifiroiu/Dev/ValetSites/workumi/resources/js/components/work/project-tree-item.tsx`
    - Render hierarchy: Projects > Work Orders > Tasks
    - Display RaciBadge at project and work order levels
    - Support expand/collapse functionality
    - Only show items where user has RACI role or task assignment
  - [x] 3.7 Create subtab-specific list views
    - Create MyWorkTasksList component for Tasks subtab
    - Create MyWorkOrdersList component for Work Orders subtab
    - Create MyWorkProjectsList component for Projects subtab
    - Each list groups items by status/priority with RaciBadge display
    - Apply visual prominence based on RACI role (Accountable > Informed)
  - [x] 3.8 Ensure UI component tests pass
    - Run ONLY the 4-6 tests written in 3.1
    - Verify component rendering and interactions

**Acceptance Criteria:**
- The 4-6 tests written in 3.1 pass
- RaciBadge displays correct colors and tooltips
- Subtabs switch views correctly
- Filters apply and clear as expected
- Tree view renders hierarchical data properly

---

#### Task Group 4: Integration and Refactoring
**Dependencies:** Task Group 3 (COMPLETED)

- [x] 4.0 Integrate components into existing My Work view
  - [x] 4.1 Write 4-6 focused integration tests
    - Test full My Work flow with subtab navigation
    - Test filter and sort combination behavior
    - Test "Show Informed" toggle persists and applies
    - Test metric click-to-filter behavior
  - [x] 4.2 Refactor MyWorkView component
    - File: `/Users/andreifiroiu/Dev/ValetSites/workumi/resources/js/components/work/my-work-view.tsx`
    - Add MyWorkMetrics at top (above subtabs)
    - Add MyWorkSubtabs below metrics
    - Add MyWorkFilters below subtabs
    - Conditionally render appropriate list/tree view based on active subtab
  - [x] 4.3 Update TypeScript types (ALREADY DONE in Task Group 3)
    - File: `/Users/andreifiroiu/Dev/ValetSites/workumi/resources/js/types/work.d.ts`
    - Add `RaciRole` type: `'accountable' | 'responsible' | 'consulted' | 'informed'`
    - Extend Project type with `userRaciRoles?: RaciRole[]`
    - Extend WorkOrder type with `userRaciRoles?: RaciRole[]`
    - Add `MyWorkMetrics` interface
    - Add filter/sort state types
  - [x] 4.4 Implement state management for filters and sorting
    - Use local component state for filter/sort values
    - Apply filters client-side for performance
    - Persist subtab selection and "show informed" toggle via API preference endpoint
  - [x] 4.5 Add responsive styling
    - Ensure metrics grid collapses appropriately on mobile (2x2 grid)
    - Filters collapse into mobile-friendly layout
    - Tree view indentation scales for mobile screens
    - Follow existing responsive patterns in the codebase
  - [x] 4.6 Ensure integration tests pass
    - Run ONLY the 4-6 tests written in 4.1
    - Verify end-to-end user flow works

**Acceptance Criteria:**
- The 4-6 tests written in 4.1 pass
- My Work view displays all new components correctly
- Subtab navigation works with proper data filtering
- Preferences persist across page reloads
- Responsive design works on all breakpoints

---

### Testing Layer

#### Task Group 5: Test Review and Gap Analysis
**Dependencies:** Task Groups 1-4 (ALL COMPLETED)

- [x] 5.0 Review existing tests and fill critical gaps only
  - [x] 5.1 Review tests from Task Groups 1-4
    - Review the 6 tests written by backend engineer (Task 1.1) in `tests/Feature/Work/RaciScopeTest.php`
    - Review the 5 tests written by API engineer (Task 2.1) in `tests/Feature/Work/MyWorkApiTest.php`
    - Review the 15 tests written by UI designer (Task 3.1) in `resources/js/components/work/__tests__/my-work-components.test.tsx`
    - Review the 11 tests written by integration engineer (Task 4.1) in `resources/js/components/work/__tests__/my-work-integration.test.tsx`
    - Total existing tests: approximately 37 tests
  - [x] 5.2 Analyze test coverage gaps for My Work feature only
    - Identify critical user workflows that lack test coverage
    - Focus ONLY on gaps related to this spec's feature requirements
    - Prioritize end-to-end workflows over unit test gaps
    - Do NOT assess entire application test coverage
  - [x] 5.3 Write up to 10 additional strategic tests maximum
    - Focus on integration points between backend and frontend
    - Test edge cases for RACI role combinations (e.g., user with multiple roles)
    - Test empty state handling (no items in any category)
    - Test filter combinations that may produce empty results
    - Do NOT write comprehensive coverage for all scenarios
  - [x] 5.4 Run feature-specific tests only
    - Run ONLY tests related to this spec's feature
    - Expected total: approximately 37-47 tests maximum
    - Do NOT run the entire application test suite
    - Verify all critical workflows pass

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 37-47 tests total)
- Critical user workflows for My Work improvements are covered
- No more than 10 additional tests added when filling in testing gaps
- Testing focused exclusively on this spec's feature requirements

---

## Execution Order

Recommended implementation sequence:

1. **Backend Layer (Task Group 1)** - RACI query scopes on models
2. **API Layer (Task Group 2)** - Controller updates and data preparation
3. **Frontend Components (Task Group 3)** - New UI components
4. **Integration (Task Group 4)** - Combine components into My Work view
5. **Test Review (Task Group 5)** - Fill critical test gaps

## Files to Create

| File | Description |
|------|-------------|
| `resources/js/components/work/raci-badge.tsx` | RACI role badge component |
| `resources/js/components/work/my-work-subtabs.tsx` | Subtab navigation component |
| `resources/js/components/work/my-work-filters.tsx` | Filter and sort controls |
| `resources/js/components/work/my-work-metrics.tsx` | Summary metrics display |
| `resources/js/components/work/my-work-tree-view.tsx` | Hierarchical tree view for "All" subtab |
| `resources/js/components/work/my-work-tasks-list.tsx` | Tasks subtab list view |
| `resources/js/components/work/my-work-orders-list.tsx` | Work Orders subtab list view |
| `resources/js/components/work/my-work-projects-list.tsx` | Projects subtab list view |

## Files to Modify

| File | Changes |
|------|---------|
| `app/Models/Project.php` | Add RACI query scope methods |
| `app/Models/WorkOrder.php` | Add RACI query scope methods |
| `app/Http/Controllers/Work/WorkController.php` | Add My Work data methods and metrics |
| `resources/js/components/work/my-work-view.tsx` | Integrate new components |
| `resources/js/types/work.ts` | Add RACI-related TypeScript types |

## Technical Notes

- **RACI Fields Exist**: Both Project and WorkOrder models already have `accountable_id`, `responsible_id`, `consulted_ids`, and `informed_ids` fields
- **Query Pattern for Arrays**: Use `whereJsonContains` for `consulted_ids` and `informed_ids` which are JSON arrays
- **Preference Pattern**: Follow existing `UserPreference::get/set` pattern used in WorkController
- **Badge Pattern**: Use class-variance-authority approach from existing StatusBadge component
- **Tree View Pattern**: Leverage existing ProjectTreeItem structure for hierarchical display
