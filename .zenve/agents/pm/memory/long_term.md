# 2026-05-08
- PRDs live in `docs/product/{feature}.md`. Why: established directory on first PRD creation.
- WorkOrder model has `scopeNotArchived` and `scopeArchived` scopes already built. Why: useful for dev agents implementing filtered queries — no new scope needed.
- WorkController::getWorkOrders() fetches all statuses without filtering. Why: root cause of issue #2; any calendar/board fix starts here.
- Two initial personas defined: Team Member (IC) and Team Lead/Manager. Why: needed for user stories; still provisional until full product vision is set.
