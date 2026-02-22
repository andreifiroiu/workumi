<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\InboxItemType;
use App\Enums\SourceType;
use App\Enums\TaskStatus;
use App\Enums\Urgency;
use App\Enums\WorkOrderStatus;
use App\Exceptions\InvalidTransitionException;
use App\Models\AIAgent;
use App\Models\AuditLog;
use App\Models\InboxItem;
use App\Models\StatusTransition;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class WorkflowTransitionService
{
    /**
     * Allowed transitions for TaskStatus.
     *
     * @var array<string, array<string>>
     */
    private const TASK_TRANSITIONS = [
        'todo' => ['in_progress', 'cancelled'],
        'in_progress' => ['in_review', 'done', 'blocked', 'cancelled'],
        'in_review' => ['approved', 'revision_requested', 'cancelled'],
        'approved' => ['done', 'revision_requested', 'cancelled'],
        'done' => [], // Terminal state
        'blocked' => ['in_progress', 'cancelled'],
        'revision_requested' => [], // Auto-transitions to in_progress
        'cancelled' => [], // Terminal state
    ];

    /**
     * Timer-initiated transitions that are allowed from terminal/review states.
     * These transitions bypass normal workflow rules when starting a timer.
     *
     * @var array<string, string>
     */
    private const TIMER_TRANSITIONS = [
        'done' => 'in_progress',
        'in_review' => 'in_progress',
        'approved' => 'in_progress',
    ];

    /**
     * Allowed transitions for WorkOrderStatus.
     *
     * @var array<string, array<string>>
     */
    private const WORK_ORDER_TRANSITIONS = [
        'draft' => ['active', 'cancelled'],
        'active' => ['in_review', 'delivered', 'blocked', 'cancelled'],
        'in_review' => ['approved', 'revision_requested', 'cancelled'],
        'approved' => ['delivered', 'revision_requested', 'cancelled'],
        'delivered' => [], // Terminal state
        'blocked' => ['active', 'cancelled'],
        'revision_requested' => [], // Auto-transitions to active
        'cancelled' => [], // Terminal state
    ];

    /**
     * Transitions that AI agents are restricted from performing.
     * These represent the "human checkpoint" transitions.
     *
     * @var array<string, array<string>>
     */
    private const AI_RESTRICTED_TRANSITIONS = [
        // Task transitions requiring human approval
        'task' => [
            'in_review_to_approved',
            'approved_to_done',
        ],
        // WorkOrder transitions requiring human approval
        'work_order' => [
            'in_review_to_approved',
            'approved_to_delivered',
        ],
    ];

    public function __construct(
        private readonly ReviewerResolver $reviewerResolver = new ReviewerResolver,
    ) {}

    /**
     * Check if a transition is allowed for the given model.
     */
    public function canTransition(
        Model $item,
        User|AIAgent $actor,
        TaskStatus|WorkOrderStatus $toStatus,
    ): bool {
        try {
            $this->validateTransition($item, $actor, $toStatus);

            return true;
        } catch (InvalidTransitionException) {
            return false;
        }
    }

    /**
     * Validate if a transition is allowed. Throws exception with reason on failure.
     *
     * @throws InvalidTransitionException
     */
    public function validateTransition(
        Model $item,
        User|AIAgent $actor,
        TaskStatus|WorkOrderStatus $toStatus,
        ?string $comment = null,
    ): void {
        $fromStatus = $this->getCurrentStatus($item);
        $fromStatusValue = $fromStatus->value;
        $toStatusValue = $toStatus->value;

        // Get the allowed transitions based on model type
        $allowedTransitions = $this->getAllowedTransitions($item);

        // Check if the transition is structurally valid
        if (! isset($allowedTransitions[$fromStatusValue])) {
            throw InvalidTransitionException::notAllowed($fromStatusValue, $toStatusValue);
        }

        if (! in_array($toStatusValue, $allowedTransitions[$fromStatusValue], true)) {
            throw InvalidTransitionException::notAllowed($fromStatusValue, $toStatusValue);
        }

        // Check AI agent restrictions
        if ($actor instanceof AIAgent) {
            $this->validateAIAgentPermission($item, $fromStatusValue, $toStatusValue);
        }

        // Check role-based permissions for human users
        if ($actor instanceof User) {
            $this->validateRoleBasedPermission($item, $actor, $fromStatusValue, $toStatusValue);
        }

        // Check if comment is required for rejection transitions
        if ($toStatusValue === 'revision_requested') {
            if (empty($comment)) {
                throw InvalidTransitionException::commentRequired($fromStatusValue, $toStatusValue);
            }
        }
    }

    /**
     * Execute a status transition.
     *
     * @throws InvalidTransitionException
     */
    public function transition(
        Model $item,
        User|AIAgent $actor,
        TaskStatus|WorkOrderStatus $toStatus,
        ?string $comment = null,
    ): StatusTransition {
        // Validate the transition first
        $this->validateTransition($item, $actor, $toStatus, $comment);

        return DB::transaction(function () use ($item, $actor, $toStatus, $comment) {
            $fromStatus = $this->getCurrentStatus($item);

            // Create the transition record
            $transition = $this->createTransitionRecord($item, $actor, $fromStatus, $toStatus, $comment);

            // Update the model status
            $item->status = $toStatus;
            $item->save();

            // Auto-assign user when transitioning task to in_progress
            // Only auto-assign if BOTH assignment fields are null
            if ($toStatus->value === 'in_progress'
                && $item instanceof Task
                && $item->assigned_to_id === null
                && $item->assigned_agent_id === null
                && $actor instanceof User) {
                $item->assigned_to_id = $actor->id;
                $item->save();
            }

            // Log to AuditLog
            $this->logToAuditLog($item, $actor, $fromStatus, $toStatus, $comment);

            // Handle InboxItem creation for InReview transitions
            if ($toStatus->value === 'in_review') {
                $this->createApprovalInboxItem($item, $actor);
            }

            // Handle InboxItem resolution for approval/rejection transitions
            if ($fromStatus->value === 'in_review' && in_array($toStatus->value, ['approved', 'revision_requested'], true)) {
                $this->resolveApprovalInboxItem($item, $toStatus->value === 'approved');
            }

            // Handle auto-transition for RevisionRequested
            if ($toStatus->value === 'revision_requested') {
                $this->handleRevisionRequestedAutoTransition($item, $actor);
            }

            // Auto-activate parent WorkOrder when a Task moves to InProgress
            if ($item instanceof Task && $toStatus->value === 'in_progress') {
                $this->autoActivateParentWorkOrder($item, $actor);
            }

            return $transition;
        });
    }

    /**
     * Execute a timer-initiated transition from terminal/review states back to InProgress.
     * This bypasses normal workflow rules for the specific case of starting a timer.
     *
     * @throws InvalidTransitionException
     */
    public function timerTransition(Task $task, User $user): StatusTransition
    {
        $fromStatus = $task->status;
        $fromStatusValue = $fromStatus->value;

        // Check if this is a valid timer transition
        if (! isset(self::TIMER_TRANSITIONS[$fromStatusValue])) {
            throw InvalidTransitionException::notAllowed($fromStatusValue, 'in_progress');
        }

        $toStatus = TaskStatus::InProgress;

        return DB::transaction(function () use ($task, $user, $fromStatus, $toStatus) {
            // Resolve any pending approval InboxItem if transitioning from InReview
            if ($fromStatus->value === 'in_review') {
                $this->resolveApprovalInboxItem($task, false);
            }

            // Create the transition record
            $transition = $this->createTransitionRecord(
                $task,
                $user,
                $fromStatus,
                $toStatus,
                'Timer started - task reopened for work'
            );

            // Update the model status
            $task->status = $toStatus;
            $task->save();

            // Auto-assign user when transitioning task to in_progress
            // Only auto-assign if BOTH assignment fields are null
            if ($task->assigned_to_id === null && $task->assigned_agent_id === null) {
                $task->assigned_to_id = $user->id;
                $task->save();
            }

            // Log to AuditLog
            $this->logToAuditLog(
                $task,
                $user,
                $fromStatus,
                $toStatus,
                'Timer started - task reopened for work'
            );

            // Auto-activate parent WorkOrder when a Task moves to InProgress
            $this->autoActivateParentWorkOrder($task, $user);

            return $transition;
        });
    }

    /**
     * Get the current status of the model.
     */
    private function getCurrentStatus(Model $item): TaskStatus|WorkOrderStatus
    {
        if ($item instanceof Task) {
            return $item->status;
        }

        if ($item instanceof WorkOrder) {
            return $item->status;
        }

        throw new \InvalidArgumentException('Item must be a Task or WorkOrder.');
    }

    /**
     * Get allowed transitions based on model type.
     *
     * @return array<string, array<string>>
     */
    private function getAllowedTransitions(Model $item): array
    {
        if ($item instanceof Task) {
            return self::TASK_TRANSITIONS;
        }

        if ($item instanceof WorkOrder) {
            return self::WORK_ORDER_TRANSITIONS;
        }

        throw new \InvalidArgumentException('Item must be a Task or WorkOrder.');
    }

    /**
     * Validate that an AI agent can perform the transition.
     *
     * @throws InvalidTransitionException
     */
    private function validateAIAgentPermission(Model $item, string $fromStatus, string $toStatus): void
    {
        $modelType = $item instanceof Task ? 'task' : 'work_order';
        $transitionKey = "{$fromStatus}_to_{$toStatus}";

        if (in_array($transitionKey, self::AI_RESTRICTED_TRANSITIONS[$modelType], true)) {
            throw InvalidTransitionException::aiAgentRestricted($fromStatus, $toStatus);
        }
    }

    /**
     * Create a status transition record.
     */
    private function createTransitionRecord(
        Model $item,
        User|AIAgent $actor,
        TaskStatus|WorkOrderStatus $fromStatus,
        TaskStatus|WorkOrderStatus $toStatus,
        ?string $comment,
    ): StatusTransition {
        return StatusTransition::create([
            'transitionable_type' => get_class($item),
            'transitionable_id' => $item->id,
            'user_id' => $actor instanceof User ? $actor->id : null,
            'from_status' => $fromStatus->value,
            'to_status' => $toStatus->value,
            'comment' => $comment,
            'created_at' => now(),
        ]);
    }

    /**
     * Log the transition to AuditLog.
     */
    private function logToAuditLog(
        Model $item,
        User|AIAgent $actor,
        TaskStatus|WorkOrderStatus $fromStatus,
        TaskStatus|WorkOrderStatus $toStatus,
        ?string $comment,
    ): void {
        $actorType = $actor instanceof User ? 'user' : 'ai_agent';
        $actorId = (string) $actor->id;
        $actorName = $actor instanceof User ? $actor->name : $actor->name;
        $modelType = $item instanceof Task ? 'Task' : 'WorkOrder';

        $details = "Status changed from '{$fromStatus->value}' to '{$toStatus->value}'";
        if ($comment) {
            $details .= ". Comment: {$comment}";
        }

        AuditLog::log(
            team: $item->team,
            actorType: $actorType,
            actorId: $actorId,
            actorName: $actorName,
            action: 'status_transition',
            details: $details,
            target: $modelType,
            targetId: (string) $item->id,
        );
    }

    /**
     * Auto-activate the parent WorkOrder when a Task transitions to InProgress.
     * If the WorkOrder is still in Draft status, it will be transitioned to Active.
     */
    private function autoActivateParentWorkOrder(Task $task, User|AIAgent $actor): void
    {
        $workOrder = $task->workOrder;

        if ($workOrder === null || $workOrder->status !== WorkOrderStatus::Draft) {
            return;
        }

        $fromStatus = $workOrder->status;
        $toStatus = WorkOrderStatus::Active;

        $this->createTransitionRecord($workOrder, $actor, $fromStatus, $toStatus, 'Auto-activated: task started');

        $workOrder->status = $toStatus;
        $workOrder->save();

        $this->logToAuditLog($workOrder, $actor, $fromStatus, $toStatus, 'Auto-activated: task started');
    }

    /**
     * Handle the auto-transition from RevisionRequested to InProgress/Active.
     */
    private function handleRevisionRequestedAutoTransition(Model $item, User|AIAgent $actor): void
    {
        if ($item instanceof Task) {
            $autoToStatus = TaskStatus::InProgress;
        } elseif ($item instanceof WorkOrder) {
            $autoToStatus = WorkOrderStatus::Active;
        } else {
            return;
        }

        $fromStatus = $this->getCurrentStatus($item);

        // Create the auto-transition record
        $this->createTransitionRecord($item, $actor, $fromStatus, $autoToStatus, 'Auto-transition from revision requested');

        // Update the model status
        $item->status = $autoToStatus;
        $item->save();

        // Log the auto-transition
        $this->logToAuditLog($item, $actor, $fromStatus, $autoToStatus, 'Auto-transition from revision requested');
    }

    /**
     * Create an approval InboxItem when a Task or WorkOrder enters InReview status.
     */
    private function createApprovalInboxItem(Model $item, User|AIAgent $actor): void
    {
        /** @var Task|WorkOrder $item */
        $reviewer = $this->reviewerResolver->resolve($item);
        $urgency = $this->determineUrgency($item);

        $isTask = $item instanceof Task;
        $workOrder = $isTask ? $item->workOrder : $item;
        $project = $item->project;

        $actorName = $actor instanceof User ? $actor->name : $actor->name;
        $actorId = $actor instanceof User ? "user-{$actor->id}" : "agent-{$actor->id}";
        $sourceType = $actor instanceof User ? SourceType::Human : SourceType::AIAgent;

        $title = $isTask
            ? "Task ready for review: {$item->title}"
            : "Work Order ready for review: {$item->title}";

        $contentPreview = $isTask
            ? "Task \"{$item->title}\" has been submitted for review."
            : "Work Order \"{$item->title}\" has been submitted for review.";

        $fullContent = $this->buildFullContent($item, $actor);

        InboxItem::create([
            'team_id' => $item->team_id,
            'type' => InboxItemType::Approval,
            'title' => $title,
            'content_preview' => $contentPreview,
            'full_content' => $fullContent,
            'source_id' => $actorId,
            'source_name' => $actorName,
            'source_type' => $sourceType,
            'related_work_order_id' => $workOrder?->id,
            'related_work_order_title' => $workOrder?->title,
            'related_task_id' => $isTask ? $item->id : null,
            'related_project_id' => $project?->id,
            'related_project_name' => $project?->name,
            'approvable_type' => get_class($item),
            'approvable_id' => $item->id,
            'urgency' => $urgency,
            'reviewer_id' => $reviewer?->id,
        ]);
    }

    /**
     * Resolve (soft delete) an approval InboxItem when approved or rejected.
     */
    private function resolveApprovalInboxItem(Model $item, bool $approved): void
    {
        $inboxItem = InboxItem::findPendingApprovalFor($item);

        if ($inboxItem === null) {
            return;
        }

        if ($approved) {
            $inboxItem->markAsApproved();
        } else {
            $inboxItem->markAsRejected();
        }
    }

    /**
     * Determine urgency based on due date proximity.
     */
    private function determineUrgency(Model $item): Urgency
    {
        /** @var Task|WorkOrder $item */
        $dueDate = $item->due_date;

        if ($dueDate === null) {
            return Urgency::Normal;
        }

        $daysUntilDue = now()->startOfDay()->diffInDays($dueDate, false);

        if ($daysUntilDue < 0) {
            // Overdue
            return Urgency::Urgent;
        }

        if ($daysUntilDue <= 2) {
            // Due within 2 days
            return Urgency::Urgent;
        }

        if ($daysUntilDue <= 7) {
            // Due within a week
            return Urgency::High;
        }

        return Urgency::Normal;
    }

    /**
     * Build full content description for the InboxItem.
     */
    private function buildFullContent(Model $item, User|AIAgent $actor): string
    {
        /** @var Task|WorkOrder $item */
        $actorName = $actor instanceof User ? $actor->name : $actor->name;
        $modelType = $item instanceof Task ? 'Task' : 'Work Order';
        $description = $item->description ?? 'No description provided.';

        $content = "{$modelType}: {$item->title}\n\n";
        $content .= "Submitted by: {$actorName}\n";
        $content .= 'Submitted at: '.now()->toDateTimeString()."\n\n";
        $content .= "Description:\n{$description}\n";

        if ($item->due_date !== null) {
            $content .= "\nDue Date: ".$item->due_date->toDateString();
        }

        return $content;
    }

    /**
     * Get the list of valid transitions from the current status.
     *
     * @return array<string>
     */
    public function getAvailableTransitions(Model $item, User|AIAgent $actor): array
    {
        $fromStatus = $this->getCurrentStatus($item);
        $allowedTransitions = $this->getAllowedTransitions($item);
        $availableTransitions = $allowedTransitions[$fromStatus->value] ?? [];

        // Filter out AI-restricted transitions for AI agents
        if ($actor instanceof AIAgent) {
            $modelType = $item instanceof Task ? 'task' : 'work_order';
            $availableTransitions = array_filter(
                $availableTransitions,
                function (string $toStatus) use ($fromStatus, $modelType): bool {
                    $transitionKey = "{$fromStatus->value}_to_{$toStatus}";

                    return ! in_array($transitionKey, self::AI_RESTRICTED_TRANSITIONS[$modelType], true);
                }
            );
        }

        return array_values($availableTransitions);
    }

    /**
     * Validate role-based permissions for human users.
     *
     * @throws InvalidTransitionException
     */
    private function validateRoleBasedPermission(
        Model $item,
        User $user,
        string $fromStatus,
        string $toStatus,
    ): void {
        // Only validate specific checkpoint transitions
        if ($fromStatus === 'in_review' && $toStatus === 'approved') {
            $this->validateApprovalPermission($item, $user);
        } elseif ($fromStatus === 'approved' && in_array($toStatus, ['done', 'delivered'], true)) {
            $this->validateDeliveryPermission($item, $user);
        }
    }

    /**
     * Validate permission for InReview → Approved transition.
     * Allowed: Team owners, managers, OR the designated reviewer (if set).
     * If no reviewer is designated, any non-submitter team member can approve (backward compatibility).
     *
     * @throws InvalidTransitionException
     */
    private function validateApprovalPermission(Model $item, User $user): void
    {
        /** @var Task|WorkOrder $item */
        $team = $item->team;

        // Team owners can always approve
        if ($user->ownsTeam($team)) {
            return;
        }

        // Managers/admins can always approve
        if ($this->isTeamManager($user, $team)) {
            return;
        }

        // For non-managers: check if this user submitted the review (prevent self-approval)
        $submitter = $this->findReviewSubmitter($item);
        if ($submitter !== null && $submitter->id === $user->id) {
            throw InvalidTransitionException::permissionDenied('in_review', 'approved');
        }

        // Check if user is the designated reviewer
        $designatedReviewer = $this->reviewerResolver->resolve($item);

        // If no reviewer is designated, allow any non-submitter team member (backward compatibility)
        if ($designatedReviewer === null) {
            return;
        }

        // Only the designated reviewer can approve
        if ($designatedReviewer->id !== $user->id) {
            throw InvalidTransitionException::notDesignatedReviewer('in_review', 'approved');
        }
    }

    /**
     * Validate permission for Approved → Done/Delivered transition.
     * Allowed: Team owners, managers, OR the assigned user.
     *
     * @throws InvalidTransitionException
     */
    private function validateDeliveryPermission(Model $item, User $user): void
    {
        /** @var Task|WorkOrder $item */
        $team = $item->team;
        $toStatus = $item instanceof Task ? 'done' : 'delivered';

        // Team owners can always mark as delivered
        if ($user->ownsTeam($team)) {
            return;
        }

        // Managers/admins can always mark as delivered
        if ($this->isTeamManager($user, $team)) {
            return;
        }

        // For Tasks: the assigned user can mark as done
        if ($item instanceof Task && $item->assigned_to_id === $user->id) {
            return;
        }

        // WorkOrders don't have direct assignment, so only managers/owners can deliver
        throw InvalidTransitionException::permissionDenied('approved', $toStatus);
    }

    /**
     * Check if user has a manager or admin role on the team.
     */
    private function isTeamManager(User $user, Team $team): bool
    {
        return $user->hasTeamRole($team, ['admin', 'manager']);
    }

    /**
     * Find the user who submitted the item for review (moved to InReview status).
     */
    private function findReviewSubmitter(Model $item): ?User
    {
        /** @var Task|WorkOrder $item */
        $transition = StatusTransition::query()
            ->where('transitionable_type', get_class($item))
            ->where('transitionable_id', $item->id)
            ->where('to_status', 'in_review')
            ->orderByDesc('created_at')
            ->first();

        if ($transition === null || $transition->user_id === null) {
            return null;
        }

        return User::find($transition->user_id);
    }
}
