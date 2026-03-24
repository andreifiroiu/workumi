# Budget and Actuals Feature

## Initial Idea

Extend the existing hour-based tracking system to support cost-based budgeting, actuals tracking, and profitability analysis.

## Current State (Already Implemented)

- **Hour tracking**: budget_hours/actual_hours on Projects, WorkOrders, Tasks
- **TimeEntry model**: Timer functionality, is_billable flag, date tracking
- **Automatic hour aggregation**: Hours roll up the hierarchy (Task > WorkOrder > Project)
- **Time Reports**: By User, By Project, Actual vs Estimated (hours only)

## What Needs to be Built

1. **Hourly rates on users/teams**: Store and manage hourly rates
2. **Cost fields on WorkOrders/Projects**: Budget and actual cost tracking
3. **Cost calculation from time entries**: Convert hours to costs using rates
4. **Budget vs Actuals views**: Cost-based comparison views
5. **Margin calculations**: Calculate and display profitability margins
6. **Profitability reports**: Reports showing profitability by project, client, or team member

## Context

This is a Laravel 12/React 19/Inertia.js application (Workumi) for work orchestration. The product mission emphasizes helping small service teams (2-10 people) understand profitability - currently described as "profitability based on vibes, not data."

The existing TimeEntry model tracks:
- user_id, task_id, team_id
- hours (decimal)
- is_billable (boolean)
- date, started_at, stopped_at (for timer functionality)
- mode (Timer vs Manual entry)
- note

The Budget and Actuals feature is listed in the roadmap as item #17, currently partially complete with budget fields existing but missing the cost calculation and reporting components.
