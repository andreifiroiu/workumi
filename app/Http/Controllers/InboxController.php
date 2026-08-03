<?php

namespace App\Http\Controllers;

use App\Enums\InboxItemType;
use App\Enums\SourceType;
use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Exceptions\InvalidTransitionException;
use App\Models\AgentWorkflowState;
use App\Models\InboxItem;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use App\Notifications\RejectionFeedbackNotification;
use App\Services\AgentOrchestrator;
use App\Services\WorkflowTransitionService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InboxController extends Controller
{
    public function __construct(
        private readonly WorkflowTransitionService $workflowService,
        private readonly AgentOrchestrator $orchestrator,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            return Inertia::render('inbox/index', [
                'inboxItems' => [],
                'teamMembers' => [],
                'projects' => [],
                'workOrders' => [],
            ]);
        }

        // Get inbox items with relationships
        $inboxItems = InboxItem::forTeam($team->id)
            ->with(['relatedWorkOrder', 'relatedProject'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (InboxItem $item) => [
                'id' => (string) $item->id,
                'type' => $item->type->value,
                'title' => $item->title,
                'contentPreview' => $item->content_preview,
                'fullContent' => $item->full_content,
                'sourceId' => $item->source_id,
                'sourceName' => $item->source_name,
                'sourceType' => $item->source_type->value,
                'relatedWorkOrderId' => $item->related_work_order_id ? (string) $item->related_work_order_id : null,
                'relatedWorkOrderTitle' => $item->related_work_order_title,
                'relatedProjectId' => $item->related_project_id ? (string) $item->related_project_id : null,
                'relatedProjectName' => $item->related_project_name,
                'urgency' => $item->urgency->value,
                'aiConfidence' => $item->ai_confidence?->value,
                'qaValidation' => $item->qa_validation?->value,
                'createdAt' => $item->created_at->toISOString(),
                'waitingHours' => $item->waitingHours,
            ])
            ->all();

        // Get team members for context
        $teamMembers = $team->allUsers()->map(fn ($user) => [
            'id' => (string) $user->id,
            'name' => $user->name,
            'type' => 'human',
            'role' => $user->role ?? 'Team Member',
            'avatarUrl' => $user->profile_photo_url,
            'skills' => [],
        ])->all();

        // Get projects and work orders for context
        $projects = Project::forTeam($team->id)->visibleTo($user->id)->get()->map(fn ($project) => [
            'id' => (string) $project->id,
            'name' => $project->name,
            'description' => $project->description,
        ])->all();

        $workOrders = WorkOrder::forTeam($team->id)->visibleTo($user->id)->get()->map(fn ($wo) => [
            'id' => (string) $wo->id,
            'title' => $wo->title,
            'projectId' => (string) $wo->project_id,
        ])->all();

        return Inertia::render('inbox/index', [
            'inboxItems' => $inboxItems,
            'teamMembers' => $teamMembers,
            'projects' => $projects,
            'workOrders' => $workOrders,
        ]);
    }

    public function approve(Request $request, InboxItem $inboxItem)
    {
        $this->authorize('update', $inboxItem);

        $user = $request->user();
        $approvable = $inboxItem->approvable;

        // If no approvable model (e.g., non-approval inbox item), just archive
        if ($approvable === null) {
            $inboxItem->delete();

            return back()->with('success', 'Item archived.');
        }

        // Handle AgentWorkflowState approvals via the orchestrator
        if ($approvable instanceof AgentWorkflowState) {
            if (! $approvable->isPaused()) {
                return back()->with('error', 'Workflow is not paused.');
            }

            $this->orchestrator->resume($approvable, [
                'approved' => true,
                'approver_id' => $user->id,
                'approver_name' => $user->name,
                'approved_at' => now()->toIso8601String(),
            ]);

            $inboxItem->delete();

            return back()->with('success', 'Workflow approved and resumed.');
        }

        // Determine the target status based on model type
        $targetStatus = $approvable instanceof Task
            ? TaskStatus::Approved
            : WorkOrderStatus::Approved;

        try {
            // Transition the underlying model - this will auto-resolve the inbox item
            $this->workflowService->transition($approvable, $user, $targetStatus);

            return back()->with('success', 'Item approved successfully.');
        } catch (InvalidTransitionException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function reject(Request $request, InboxItem $inboxItem)
    {
        $this->authorize('update', $inboxItem);

        $validated = $request->validate([
            'feedback' => 'required|string|max:1000',
        ]);

        $user = $request->user();
        $approvable = $inboxItem->approvable;
        $feedback = $validated['feedback'];

        // If no approvable model, just archive with feedback note
        if ($approvable === null) {
            $inboxItem->delete();

            return back()->with('success', 'Item rejected and archived.');
        }

        // Handle AgentWorkflowState rejections via the orchestrator
        if ($approvable instanceof AgentWorkflowState) {
            if (! $approvable->isPaused()) {
                return back()->with('error', 'Workflow is not paused.');
            }

            $this->orchestrator->resume($approvable, [
                'approved' => false,
                'rejected' => true,
                'rejection_reason' => $feedback,
                'approver_id' => $user->id,
                'approver_name' => $user->name,
                'rejected_at' => now()->toIso8601String(),
            ]);

            $inboxItem->delete();

            return back()->with('success', 'Workflow rejected with feedback.');
        }

        // Determine the target status based on model type
        $targetStatus = $approvable instanceof Task
            ? TaskStatus::RevisionRequested
            : WorkOrderStatus::RevisionRequested;

        try {
            // Transition the underlying model with feedback as comment
            // This will auto-resolve the inbox item and auto-transition to InProgress/Active
            $this->workflowService->transition($approvable, $user, $targetStatus, $feedback);

            // Route feedback to the original submitter
            $this->routeFeedbackToSubmitter($inboxItem, $user, $feedback);

            return back()->with('success', 'Item rejected with feedback sent to submitter.');
        } catch (InvalidTransitionException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function defer(Request $request, InboxItem $inboxItem)
    {
        $this->authorize('update', $inboxItem);

        // Defer updates the timestamp to push it to the bottom
        $inboxItem->touch();

        return back()->with('success', 'Item deferred.');
    }

    public function archive(Request $request, InboxItem $inboxItem)
    {
        $this->authorize('delete', $inboxItem);

        $inboxItem->delete();

        return back()->with('success', 'Item archived.');
    }

    public function bulkAction(Request $request)
    {
        $validated = $request->validate([
            'itemIds' => 'required|array',
            'itemIds.*' => 'exists:inbox_items,id',
            'action' => 'required|in:approve,defer,archive',
        ]);

        $user = $request->user();
        $team = $user->currentTeam;
        $items = InboxItem::forTeam($team->id)
            ->whereIn('id', $validated['itemIds'])
            ->get();

        $errors = [];
        $successCount = 0;

        foreach ($items as $item) {
            $this->authorize('update', $item);

            switch ($validated['action']) {
                case 'approve':
                    $result = $this->performApproval($item, $user);
                    if ($result === true) {
                        $successCount++;
                    } else {
                        $errors[] = "Item '{$item->title}': {$result}";
                    }
                    break;
                case 'archive':
                    $item->delete();
                    $successCount++;
                    break;
                case 'defer':
                    $item->touch();
                    $successCount++;
                    break;
            }
        }

        if (count($errors) > 0) {
            $message = "{$successCount} item(s) processed. Errors: ".implode('; ', $errors);

            return back()->with('warning', $message);
        }

        return back()->with('success', ucfirst($validated['action'])." action completed for {$successCount} item(s).");
    }

    /**
     * Perform approval on a single inbox item, returning true on success or error message on failure.
     */
    private function performApproval(InboxItem $inboxItem, $user): bool|string
    {
        $approvable = $inboxItem->approvable;

        // If no approvable model, just archive
        if ($approvable === null) {
            $inboxItem->delete();

            return true;
        }

        // Handle AgentWorkflowState approvals via the orchestrator
        if ($approvable instanceof AgentWorkflowState) {
            if (! $approvable->isPaused()) {
                return 'Workflow is not paused.';
            }

            $this->orchestrator->resume($approvable, [
                'approved' => true,
                'approver_id' => $user->id,
                'approver_name' => $user->name,
                'approved_at' => now()->toIso8601String(),
            ]);

            $inboxItem->delete();

            return true;
        }

        $targetStatus = $approvable instanceof Task
            ? TaskStatus::Approved
            : WorkOrderStatus::Approved;

        try {
            $this->workflowService->transition($approvable, $user, $targetStatus);

            return true;
        } catch (InvalidTransitionException $e) {
            return $e->getMessage();
        }
    }

    /**
     * Route rejection feedback to the original submitter by creating a new InboxItem.
     */
    private function routeFeedbackToSubmitter(InboxItem $originalItem, $reviewer, string $feedback): void
    {
        // Parse the source_id to determine the submitter type and ID
        $sourceId = $originalItem->source_id;

        // Skip routing if the source was an AI agent (different mechanism needed)
        if ($originalItem->source_type === SourceType::AIAgent) {
            // For AI agents, we could potentially log this or trigger a different notification
            // For now, we skip creating a human inbox item
            return;
        }

        // Parse user ID from source_id format: "user-{id}"
        if (! str_starts_with($sourceId, 'user-')) {
            return;
        }

        $submitterUserId = (int) substr($sourceId, 5);

        // Don't create feedback item if reviewer is the submitter (edge case)
        if ($submitterUserId === $reviewer->id) {
            return;
        }

        // Create a new feedback InboxItem for the submitter
        InboxItem::create([
            'team_id' => $originalItem->team_id,
            'type' => InboxItemType::Flag,
            'title' => "Revision requested: {$originalItem->title}",
            'content_preview' => 'Your submission requires revisions. See feedback below.',
            'full_content' => $this->buildFeedbackContent($originalItem, $reviewer, $feedback),
            'source_id' => "user-{$reviewer->id}",
            'source_name' => $reviewer->name,
            'source_type' => SourceType::Human,
            'related_work_order_id' => $originalItem->related_work_order_id,
            'related_work_order_title' => $originalItem->related_work_order_title,
            'related_task_id' => $originalItem->related_task_id,
            'related_project_id' => $originalItem->related_project_id,
            'related_project_name' => $originalItem->related_project_name,
            'urgency' => $originalItem->urgency,
            'reviewer_id' => $submitterUserId,
        ]);

        // Send notification to the submitter
        $submitter = User::find($submitterUserId);
        $approvable = $originalItem->approvable;

        if ($submitter !== null && $approvable !== null) {
            $submitter->notify(new RejectionFeedbackNotification(
                item: $approvable,
                reviewer: $reviewer,
                feedback: $feedback,
            ));
        }
    }

    /**
     * Build the full content for a rejection feedback InboxItem.
     */
    private function buildFeedbackContent(InboxItem $originalItem, $reviewer, string $feedback): string
    {
        $content = "## Revision Requested\n\n";
        $content .= "**Reviewed by:** {$reviewer->name}\n";
        $content .= '**Date:** '.now()->toDateTimeString()."\n\n";
        $content .= "### Feedback\n\n";
        $content .= $feedback."\n\n";
        $content .= "---\n\n";
        $content .= "### Original Submission\n\n";
        $content .= $originalItem->full_content ?? $originalItem->content_preview ?? 'No content available.';

        return $content;
    }
}
