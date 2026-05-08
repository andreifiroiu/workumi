# 2026-05-08
- PRDs live in `docs/product/{feature}.md`, plans in `docs/plans/{feature}.md`. Why: standard paths for architect output.
- `WorkController::getWorkOrders()` feeds all Work views (Board, List, Calendar, etc.) — not just the calendar. Why: important when scoping future filtering changes.
- No tests exist for `WorkController::index` as of this date. Why: first plan to add tests here; dev agent needs to scaffold from scratch.
