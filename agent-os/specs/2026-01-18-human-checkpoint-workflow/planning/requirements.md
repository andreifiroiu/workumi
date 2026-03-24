# Spec Requirements: Human Checkpoint Workflow

## Initial Description

Implementation of the Human Checkpoint Workflow system for Workumi. This feature establishes the Draft > Review > Approve > Deliver state machine for work items, with role-based transition permissions, RACI framework integration, and approval flow enforcement. The system ensures that AI agents can draft work but only humans can approve and deliver, maintaining quality oversight while capturing productivity gains from AI assistance.

This is item #14 on the product roadmap: "Human Checkpoint Workflow - Draft > Review > Approve > Deliver state machine for work items, role-based transition permissions, and approval flow enforcement."

## Requirements Discussion

### First Round Questions

**Q1:** Who can assign RACI roles on work items?
**Answer:** Any assigned team member can set R/A/C/I assignments. Activity should be logged and displayed in history.

**Q2:** How should RACI apply to different entity types (Projects, Work Orders, Tasks)?
**Answer:**
- **Projects:** Accountable (A) required = project owner. R/C/I optional
- **Work Orders:** Accountable (A) required. R/C/I optional. Also add "created by" field
- **Tasks:** Use just ONE field for assigned user (no full RACI). Also add "created by" field
- **NEW: Add "Blocked" status to both Tasks and Work Orders**

**Q3:** How should auto-assignment work when existing assignments are present?
**Answer:** Require confirmation before changing existing assignment.

**Q4:** How should the system determine who reviews work when no explicit reviewer is set?
**Answer:** Yes, Accountable (A) becomes default reviewer. Priority order:
1. Specific reviewer field
2. Accountable (A) person
3. Work order owner/manager
4. Project owner (fallback)

### Existing Code to Reference

**Similar Features Identified:**
- Time tracking system recently implemented (includes timer controls, soft deletes for entries)
- Deliverable versioning system (file upload, version management, notifications)
- InboxItem model for centralized approval queue
- Existing status enums for work items

No specific paths provided by user, but existing models and enum structures should be referenced.

### Follow-up Questions

No additional follow-up questions were required. All requirements were clarified through the comprehensive first-round discussion.

## Visual Assets

### Files Provided:
Inspiration for approval/review flow in the visuals folder.

### Visual Insights:
N/A

## Requirements Summary

### Functional Requirements

#### Status Workflows

**Task Statuses:**
- Todo (initial state)
- InProgress
- InReview (optional checkpoint)
- Approved (optional checkpoint)
- Done (terminal state)
- Blocked (can be entered from InProgress)
- Cancelled (can be entered from any state)
- RevisionRequested (returns to InProgress)

**Work Order Statuses:**
- Draft (initial state)
- Active
- InReview
- Approved
- Delivered (terminal state)
- Blocked (new status)
- Cancelled (can be entered from any state)
- RevisionRequested (returns to Active)

#### Automatic Status Transitions

- Starting timer on a Todo task automatically transitions to InProgress
- Clicking "Start Work" button on a Todo task transitions to InProgress
- Starting timer on a Done/InReview/Approved task triggers a confirmation dialog asking whether to move back to InProgress

#### Time Tracking Restrictions

- **Blocked for:** Cancelled, Done statuses (cannot start timer)
- **Todo status:** Auto-moves to InProgress when timer starts
- **Done/InReview/Approved:** Shows confirmation dialog before moving back to InProgress when timer is started

#### Permission Matrix (State Transitions)

| Transition | Who Can Perform |
|------------|-----------------|
| Draft/Todo to InProgress/Active | Anyone assigned or any team member |
| Any to InReview | Anyone assigned or any team member |
| InReview to Approved | Managers/owners OR anyone except the person who submitted for review |
| Approved to Done/Delivered | Managers/owners OR the assigned person |

**AI Agent Permissions:**
- CAN create work items
- CAN submit work for review (transition to InReview)
- CANNOT approve work (InReview to Approved)
- CANNOT deliver work (Approved to Done/Delivered)

#### RACI Framework Implementation

**Projects:**
- Accountable (A): Required field - project owner
- Responsible (R): Optional
- Consulted (C): Optional
- Informed (I): Optional

**Work Orders:**
- Accountable (A): Required field
- Responsible (R): Optional
- Consulted (C): Optional
- Informed (I): Optional
- created_by: Required field (auto-populated)

**Tasks:**
- assigned_to: Single user field (simplified from full RACI)
- created_by: Required field (auto-populated)

#### Reviewer Auto-Determination (Priority Order)

When determining who should review a work item:
1. Specific reviewer field on the work item (if populated)
2. Accountable (A) person from RACI assignment
3. Work order owner/manager
4. Project owner (fallback)

#### Rejection Flow

- Introduce "RevisionRequested" status for both Tasks and Work Orders
- When rejecting work:
  - Feedback/justification is REQUIRED
  - Task returns to InProgress status
  - Work Order returns to Active status
- Rejection feedback is stored and displayed in history

#### Audit and History

- Track who performed each transition and when
- Support optional comments on any state transition
- Full transition history visible on work items (activity log)
- Notifications sent to relevant parties on transitions

### Reusability Opportunities

- Leverage existing InboxItem model for approval queue integration
- Use existing notification patterns from deliverable versioning system
- Reference time tracking implementation for timer confirmation dialogs
- Utilize existing enum patterns for status definitions

### Scope Boundaries

**In Scope:**
- Status workflow state machine for Tasks and Work Orders
- RACI framework implementation (differentiated by entity type)
- Permission-based state transitions
- Automatic status transitions from timer/work actions
- Reviewer auto-determination logic
- Rejection flow with required feedback
- Full audit trail for transitions
- Integration with InboxItem for approvals queue
- Notifications for relevant parties

**Out of Scope (Future Roadmap):**
- Multi-level approvals requiring 2+ approvers
- Conditional workflows based on budget thresholds
- External client approval portals
- Complex approval chains or routing rules

### Technical Considerations

- State machine should be implemented as a reusable service
- Status enums need to be extended/created for new statuses (Blocked, RevisionRequested)
- RACI fields should be added to appropriate models (Projects, Work Orders)
- created_by field should be added to Work Orders and Tasks
- assigned_to field should be the single assignment field for Tasks
- Transition permissions should be evaluated at runtime based on user role and relationship to work item
- Audit log entries should capture: user_id, timestamp, from_status, to_status, optional comment
- AI agents should be identifiable in the system to enforce their permission restrictions
- Confirmation dialogs needed for: changing existing assignments, timer on completed work
