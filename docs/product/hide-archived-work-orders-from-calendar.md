# PRD: Hide Archived Work Orders from Calendar

## Overview

The Work/Calendar view currently displays all work orders regardless of status, including archived ones. Archived work orders clutter the calendar and mislead users into thinking they have active obligations on dates that are no longer relevant. This change excludes archived work orders from the calendar view.

## Problem

When a team member opens Work > Calendar, they see archived work orders alongside active ones. Archived work orders represent completed or retired work — they have no remaining action required. Displaying them on the calendar creates visual noise, makes it harder to scan for real upcoming deadlines, and can cause confusion about workload.

**Who experiences it:** Any team member using the Calendar view to plan their week or track upcoming deadlines.
**Frequency:** Every time the Calendar view is loaded.
**Current workaround:** None — users must mentally filter out archived items.

## Users

| Persona | Relevance |
|---|---|
| Team Member | Primary. Uses the calendar to see upcoming work and deadlines. |
| Team Lead / Manager | Secondary. Uses the calendar for workload visibility across the team. |

## Goals

- Calendar view only displays work orders that represent current or future obligations.
- Users can trust the calendar as an accurate reflection of active work.

## Non-Goals

- Adding a toggle or filter to show/hide archived work orders on the calendar (future consideration).
- Filtering archived projects from the calendar (separate concern — not part of this story).
- Changes to any other Work view (Board, List, Archive, etc.).

## Requirements

### Functional

- The Calendar view does not display work orders with status `archived`.
- All other work order statuses (`draft`, `active`, `in_review`, `approved`, `delivered`, `blocked`, `cancelled`, `revision_requested`) continue to appear on the calendar as they do today.

### Non-Functional

- No perceptible change in page load time.
- Existing tests for the calendar and work order views continue to pass.

## User Stories

### Story: Exclude archived work orders from calendar

**As a** team member,
**I want** the Work/Calendar view to hide archived work orders,
**so that** I only see work that is current or upcoming and can plan my time accurately.

#### Acceptance Criteria

- [ ] When a work order has status `archived`, it does not appear on any date in the Calendar view.
- [ ] When a work order has any status other than `archived`, it continues to appear on the calendar on its due date (existing behaviour, unchanged).
- [ ] If all work orders on a given date are archived, that date appears empty on the calendar (no event indicators).
- [ ] Archiving a work order that was previously visible on the calendar removes it from the calendar on the next page load.

#### Out of scope

- Show/hide toggle for archived work orders on the calendar.
- Filtering archived projects from the calendar.
- Real-time removal of an archived work order without a page reload.

#### Notes

- The `WorkOrder` model already has a `scopeNotArchived` query scope that filters out archived records. The backend query in `WorkController::getWorkOrders()` currently fetches all statuses — applying the existing scope is the most straightforward path.
- The fix can be applied server-side (preferred, reduces payload) or client-side. This is an implementation decision for the dev agent.

## Open Questions

_None — requirements are clear._

## Appendix

**Relevant files (for dev context):**

| File | Role |
|---|---|
| `app/Http/Controllers/Work/WorkController.php` | `getWorkOrders()` method fetches all work orders for the team without status filtering. |
| `app/Models/WorkOrder.php` | Defines `scopeNotArchived()` scope. |
| `app/Enums/WorkOrderStatus.php` | Enum with `Archived` case (value `'archived'`). |
| `resources/js/components/work/calendar-view.tsx` | Frontend calendar component; receives `workOrders` prop and renders events by due date. |
