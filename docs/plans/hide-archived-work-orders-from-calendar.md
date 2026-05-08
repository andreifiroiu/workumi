# Plan: Hide Archived Work Orders from Calendar

## Issue
Archived work orders appear on the Work/Calendar view, creating visual noise. They must be excluded so the calendar only shows active obligations.

## Context
- PRD: `docs/product/hide-archived-work-orders-from-calendar.md`
- `WorkController::getWorkOrders()` (line 310–341 of `app/Http/Controllers/Work/WorkController.php`) fetches all work orders for the team without any status filtering — this is the data source for the calendar view.
- `WorkOrder` model already has `scopeNotArchived()` (line 208 of `app/Models/WorkOrder.php`) that filters `status != 'archived'`.
- `calendar-view.tsx` receives the full `workOrders` prop and renders all of them — no client-side filtering by status exists.
- No existing tests cover `WorkController::index` or the calendar view.
- External dependencies: None.

## Changes

1. **Apply `notArchived` scope to `getWorkOrders` query**
   - File: `app/Http/Controllers/Work/WorkController.php`
   - In the `getWorkOrders()` method (line 312), chain `->notArchived()` onto the query: `WorkOrder::forTeam($team->id)->notArchived()->with([...])`.
   - This is the only change needed. The calendar component receives the filtered data via Inertia props — no frontend change required.

2. **Add feature test: archived work orders are excluded from Work page data**
   - File: `tests/Feature/Work/WorkControllerCalendarTest.php`
   - Create a Pest feature test file using `php artisan make:test --pest Work/WorkControllerCalendarTest`.
   - Test 1 — "archived work orders are not included in workOrders prop": Create a team, an active work order, and an archived work order. Hit `GET /work` as an authenticated team member. Assert the response Inertia prop `workOrders` contains the active work order and does not contain the archived one.
   - Test 2 — "non-archived statuses are included in workOrders prop": Create work orders with statuses `draft`, `active`, `in_review`, `approved`, `delivered`, `blocked`, `cancelled`, `revision_requested`. Hit `GET /work`. Assert all are present in `workOrders`.

## Considerations
- The `getWorkOrders()` method feeds all Work views (Board, List, Calendar, etc.), not just the calendar. Applying `notArchived()` here removes archived work orders from every view that consumes this prop. This is the correct behavior — there is already a dedicated Archive view. If a future requirement needs archived work orders in a non-archive view, a separate query method would be introduced.
- The stats bar in `calendar-view.tsx` (total items, overdue count) automatically adjusts because it counts from the `workOrders` prop — no separate fix needed.
- The `getProjects()` method loads nested `workOrderLists.workOrders` without status filtering. This is out of scope for this issue (the PRD explicitly scopes to the calendar's work order display, not project sub-items).

## Verification
- Create an archived work order with a due date in the current month. Load Work/Calendar. The archived work order does not appear on the calendar.
- Create an active work order with a due date in the current month. Load Work/Calendar. The active work order appears on the calendar.
- Run `php artisan test --compact tests/Feature/Work/WorkControllerCalendarTest.php` — all tests pass.
