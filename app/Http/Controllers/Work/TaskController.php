<?php

namespace App\Http\Controllers\Work;

use App\Enums\AgentType;
use App\Enums\Priority;
use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Http\Controllers\Controller;
use App\Jobs\ProcessDispatcherRouting;
use App\Models\AIAgent;
use App\Models\StatusTransition;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\WorkOrder;
use App\Services\WorkflowTransitionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TaskController extends Controller
{
    public function __construct(
        private readonly WorkflowTransitionService $transitionService,
    ) {}

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'workOrderId' => 'required|exists:work_orders,id',
            'assignedToId' => 'nullable|exists:users,id',
            'dueDate' => 'required|date',
            'estimatedHours' => 'nullable|numeric|min:0',
            'checklistItems' => 'nullable|array',
        ]);

        $user = $request->user();
        $team = $user->currentTeam;
        $workOrder = WorkOrder::findOrFail($validated['workOrderId']);

        // Format checklist items with IDs if not present
        $checklistItems = collect($validated['checklistItems'] ?? [])->map(function ($item) {
            if (is_string($item)) {
                return [
                    'id' => Str::uuid()->toString(),
                    'text' => $item,
                    'completed' => false,
                ];
            }

            return $item;
        })->all();

        Task::create([
            'team_id' => $team->id,
            'work_order_id' => $validated['workOrderId'],
            'project_id' => $workOrder->project_id,
            'assigned_to_id' => $validated['assignedToId'] ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => TaskStatus::Todo,
            'due_date' => $validated['dueDate'],
            'estimated_hours' => $validated['estimatedHours'] ?? 0,
            'checklist_items' => $checklistItems,
        ]);

        return back();
    }

    public function show(Request $request, Task $task): Response
    {
        $this->authorize('view', $task);

        $task->load([
            'workOrder',
            'project',
            'assignedTo',
            'assignedAgent',
            'timeEntries.user',
            'documents',
            'statusTransitions.user',
            'statusTransitions.fromAssignedTo',
            'statusTransitions.toAssignedTo',
            'statusTransitions.fromAssignedAgent',
            'statusTransitions.toAssignedAgent',
        ]);

        // Get active timer if any
        $activeTimer = $task->timeEntries()
            ->whereNotNull('started_at')
            ->whereNull('stopped_at')
            ->where('user_id', $request->user()->id)
            ->first();

        // Get allowed transitions for current user
        $allowedTransitions = $this->getFormattedAllowedTransitions($task, $request->user());

        // Get rejection feedback if applicable (status is InProgress and previous transition was from RevisionRequested)
        $rejectionFeedback = $this->getRejectionFeedback($task);

        // Get available AI agents for the team
        $availableAgents = AIAgent::query()
            ->whereHas('configurations', function ($query) use ($task) {
                $query->where('team_id', $task->team_id)
                    ->where('enabled', true);
            })
            ->get()
            ->map(fn (AIAgent $agent) => [
                'id' => (string) $agent->id,
                'name' => $agent->name,
            ]);

        // Sibling data for breadcrumb navigation
        $siblingWorkOrders = WorkOrder::where('project_id', $task->project_id)
            ->notArchived()
            ->select('id', 'title')
            ->orderBy('title')
            ->get();

        $siblingTasks = Task::where('work_order_id', $task->work_order_id)
            ->notArchived()
            ->select('id', 'title')
            ->orderBy('title')
            ->get();

        return Inertia::render('work/tasks/[id]', [
            'siblingWorkOrders' => $siblingWorkOrders->map(fn (WorkOrder $wo) => [
                'id' => (string) $wo->id,
                'title' => $wo->title,
            ]),
            'siblingTasks' => $siblingTasks->map(fn (Task $t) => [
                'id' => (string) $t->id,
                'title' => $t->title,
            ]),
            'task' => [
                'id' => (string) $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'workOrderId' => (string) $task->work_order_id,
                'workOrderTitle' => $task->workOrder?->title ?? 'Unknown',
                'projectId' => (string) $task->project_id,
                'projectName' => $task->project?->name ?? 'Unknown',
                'assignedToId' => $task->assigned_to_id ? (string) $task->assigned_to_id : null,
                'assignedToName' => $task->assignedTo?->name ?? 'Unassigned',
                'assignedAgentId' => $task->assigned_agent_id ? (string) $task->assigned_agent_id : null,
                'assignedAgentName' => $task->assignedAgent?->name ?? null,
                'status' => $task->status->value,
                'dueDate' => $task->due_date?->format('Y-m-d'),
                'estimatedHours' => (float) $task->estimated_hours,
                'actualHours' => (float) $task->actual_hours,
                'checklistItems' => $task->checklist_items ?? [],
                'dependencies' => $task->dependencies ?? [],
                'isBlocked' => $task->is_blocked,
            ],
            'timeEntries' => $task->timeEntries->map(fn (TimeEntry $entry) => [
                'id' => (string) $entry->id,
                'userId' => (string) $entry->user_id,
                'userName' => $entry->user?->name ?? 'Unknown',
                'hours' => (float) $entry->hours,
                'date' => $entry->date->format('Y-m-d'),
                'mode' => $entry->mode->value,
                'note' => $entry->note,
                'startedAt' => $entry->started_at?->toIso8601String(),
                'stoppedAt' => $entry->stopped_at?->toIso8601String(),
            ]),
            'activeTimer' => $activeTimer ? [
                'id' => (string) $activeTimer->id,
                'startedAt' => $activeTimer->started_at->toIso8601String(),
            ] : null,
            'teamMembers' => $task->project->team->users
                ->push($task->project->team->owner)
                ->push($request->user())
                ->unique('id')
                ->filter()
                ->values()
                ->map(fn ($user) => [
                    'id' => (string) $user->id,
                    'name' => $user->name,
                ]),
            'availableAgents' => $availableAgents,
            'statusTransitions' => $task->statusTransitions->map(fn ($transition) => [
                'id' => $transition->id,
                'actionType' => $transition->action_type ?? 'status_change',
                'fromStatus' => $transition->from_status,
                'toStatus' => $transition->to_status,
                'fromAssignedTo' => $transition->fromAssignedTo ? [
                    'id' => $transition->fromAssignedTo->id,
                    'name' => $transition->fromAssignedTo->name,
                ] : null,
                'toAssignedTo' => $transition->toAssignedTo ? [
                    'id' => $transition->toAssignedTo->id,
                    'name' => $transition->toAssignedTo->name,
                ] : null,
                'fromAssignedAgent' => $transition->fromAssignedAgent ? [
                    'id' => $transition->fromAssignedAgent->id,
                    'name' => $transition->fromAssignedAgent->name,
                ] : null,
                'toAssignedAgent' => $transition->toAssignedAgent ? [
                    'id' => $transition->toAssignedAgent->id,
                    'name' => $transition->toAssignedAgent->name,
                ] : null,
                'user' => $transition->user ? [
                    'id' => $transition->user->id,
                    'name' => $transition->user->name,
                    'email' => $transition->user->email,
                    'avatar' => $transition->user->avatar ?? null,
                ] : null,
                'createdAt' => $transition->created_at->toIso8601String(),
                'comment' => $transition->comment,
                'commentCategory' => $transition->comment_category ?? null,
            ]),
            'allowedTransitions' => $allowedTransitions,
            'rejectionFeedback' => $rejectionFeedback,
        ]);
    }

    public function update(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'assignedToId' => 'nullable|exists:users,id',
            'assignedAgentId' => 'nullable|exists:ai_agents,id',
            'dueDate' => 'sometimes|required|date',
            'estimatedHours' => 'nullable|numeric|min:0',
            'checklistItems' => 'nullable|array',
            'isBlocked' => 'sometimes|boolean',
        ]);

        // Validate mutual exclusivity: can't assign to both user and agent
        if (! empty($validated['assignedToId']) && ! empty($validated['assignedAgentId'])) {
            return back()->withErrors([
                'assignedToId' => 'Cannot assign to both a user and an AI agent.',
            ]);
        }

        // Capture current assignment values before update
        $oldAssignedToId = $task->assigned_to_id;
        $oldAssignedAgentId = $task->assigned_agent_id;

        $updateData = [];
        if (isset($validated['title'])) {
            $updateData['title'] = $validated['title'];
        }
        if (array_key_exists('description', $validated)) {
            $updateData['description'] = $validated['description'];
        }

        // Handle mutual exclusivity for assignments
        if (array_key_exists('assignedToId', $validated)) {
            $updateData['assigned_to_id'] = $validated['assignedToId'];
            // Clear agent assignment if assigning to user
            if (! empty($validated['assignedToId'])) {
                $updateData['assigned_agent_id'] = null;
            }
        }
        if (array_key_exists('assignedAgentId', $validated)) {
            $updateData['assigned_agent_id'] = $validated['assignedAgentId'];
            // Clear user assignment if assigning to agent
            if (! empty($validated['assignedAgentId'])) {
                $updateData['assigned_to_id'] = null;
            }
        }

        if (isset($validated['dueDate'])) {
            $updateData['due_date'] = $validated['dueDate'];
        }
        if (array_key_exists('estimatedHours', $validated)) {
            $updateData['estimated_hours'] = $validated['estimatedHours'] ?? 0;
        }
        if (isset($validated['checklistItems'])) {
            $updateData['checklist_items'] = $validated['checklistItems'];
        }
        if (isset($validated['isBlocked'])) {
            $updateData['is_blocked'] = $validated['isBlocked'];
        }

        $task->update($updateData);

        // Determine new assignment values (accounting for mutual exclusivity logic)
        $newAssignedToId = $updateData['assigned_to_id'] ?? $task->assigned_to_id;
        $newAssignedAgentId = $updateData['assigned_agent_id'] ?? $task->assigned_agent_id;

        // Check if assignment changed
        $assignmentChanged = $oldAssignedToId !== $newAssignedToId
            || $oldAssignedAgentId !== $newAssignedAgentId;

        if ($assignmentChanged) {
            StatusTransition::create([
                'transitionable_type' => Task::class,
                'transitionable_id' => $task->id,
                'user_id' => $request->user()->id,
                'action_type' => 'assignment_change',
                'from_assigned_to_id' => $oldAssignedToId,
                'to_assigned_to_id' => $newAssignedToId,
                'from_assigned_agent_id' => $oldAssignedAgentId,
                'to_assigned_agent_id' => $newAssignedAgentId,
            ]);
        }

        return back();
    }

    public function archive(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);

        $task->update(['status' => TaskStatus::Archived]);

        // Recalculate project progress
        $task->project->recalculateProgress();

        return back();
    }

    public function restoreTask(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);

        $task->update(['status' => TaskStatus::Todo]);

        // Recalculate project progress
        $task->project->recalculateProgress();

        return back();
    }

    public function bulkArchiveCompleted(Request $request, WorkOrder $workOrder): RedirectResponse
    {
        $this->authorize('update', $workOrder);

        $workOrder->tasks()
            ->where('status', TaskStatus::Done)
            ->update(['status' => TaskStatus::Archived]);

        // Recalculate project progress
        $workOrder->project->recalculateProgress();

        return back();
    }

    public function destroy(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('delete', $task);

        $workOrderId = $task->work_order_id;
        $taskTitle = $task->title;

        StatusTransition::create([
            'transitionable_type' => WorkOrder::class,
            'transitionable_id' => $workOrderId,
            'user_id' => $request->user()->id,
            'action_type' => 'status_change',
            'comment' => "Task \"{$taskTitle}\" deleted",
            'created_at' => now(),
        ]);

        $task->delete();

        return redirect()->route('work-orders.show', $workOrderId);
    }

    public function updateStatus(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'status' => 'required|string|in:todo,in_progress,done',
        ]);

        $newStatus = TaskStatus::from($validated['status']);

        $task->update([
            'status' => $newStatus,
        ]);

        // Auto-activate parent WorkOrder when task moves to in_progress
        if ($newStatus === TaskStatus::InProgress) {
            $workOrder = $task->workOrder;
            if ($workOrder && $workOrder->status === WorkOrderStatus::Draft) {
                $workOrder->update(['status' => WorkOrderStatus::Active]);
            }
        }

        // Update project progress
        $task->project->recalculateProgress();

        return back();
    }

    public function toggleChecklist(Request $request, Task $task, string $itemId): RedirectResponse
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'completed' => 'required|boolean',
        ]);

        $task->toggleChecklistItem($itemId, $validated['completed']);

        return back();
    }

    /**
     * Add a new checklist item to the task.
     */
    public function addChecklistItem(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'text' => 'required|string|max:255',
        ]);

        $checklistItems = $task->checklist_items ?? [];
        $checklistItems[] = [
            'id' => Str::uuid()->toString(),
            'text' => $validated['text'],
            'completed' => false,
        ];

        $task->update(['checklist_items' => $checklistItems]);

        return back();
    }

    /**
     * Update a checklist item's text.
     */
    public function updateChecklistItem(Request $request, Task $task, string $itemId): RedirectResponse
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'text' => 'required|string|max:255',
        ]);

        $checklistItems = collect($task->checklist_items ?? [])->map(function ($item) use ($itemId, $validated) {
            if ($item['id'] === $itemId) {
                $item['text'] = $validated['text'];
            }

            return $item;
        })->all();

        $task->update(['checklist_items' => $checklistItems]);

        return back();
    }

    /**
     * Delete a checklist item from the task.
     */
    public function deleteChecklistItem(Task $task, string $itemId): RedirectResponse
    {
        $this->authorize('update', $task);

        $checklistItems = collect($task->checklist_items ?? [])
            ->filter(fn ($item) => $item['id'] !== $itemId)
            ->values()
            ->all();

        $task->update(['checklist_items' => $checklistItems]);

        return back();
    }

    /**
     * Promote a task to a work order.
     */
    public function promote(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|string|in:low,medium,high,urgent',
            'dueDate' => 'nullable|date',
            'estimatedHours' => 'nullable|numeric|min:0',
            'assignedToId' => 'nullable|exists:users,id',
            'acceptanceCriteria' => 'nullable|array',
            'acceptanceCriteria.*' => 'string',
            'originalTaskAction' => 'required|string|in:cancel,delete,keep',
            'convertChecklistToTasks' => 'boolean',
            'dispatcherEnabled' => 'boolean',
        ]);

        $user = $request->user();
        $task->load('workOrder.project');

        // Build metadata with dispatcher preference
        $metadata = [];
        $dispatcherEnabled = $validated['dispatcherEnabled'] ?? false;
        if ($dispatcherEnabled) {
            $metadata['dispatcher_enabled'] = true;
        }

        // Create the new work order
        $workOrder = WorkOrder::create([
            'team_id' => $task->team_id,
            'project_id' => $task->workOrder->project_id,
            'assigned_to_id' => $validated['assignedToId'] ?? $task->assigned_to_id,
            'created_by_id' => $user->id,
            'party_contact_id' => $task->workOrder->project->party_id ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? $task->description,
            'status' => WorkOrderStatus::Draft,
            'priority' => Priority::from($validated['priority']),
            'due_date' => $validated['dueDate'] ?? $task->due_date,
            'estimated_hours' => $validated['estimatedHours'] ?? $task->estimated_hours,
            'acceptance_criteria' => $validated['acceptanceCriteria'] ?? [],
            'accountable_id' => $user->id,
            'metadata' => $metadata,
        ]);

        // Optionally convert checklist items to tasks
        if (($validated['convertChecklistToTasks'] ?? false) && ! empty($task->checklist_items)) {
            foreach ($task->checklist_items as $item) {
                Task::create([
                    'team_id' => $task->team_id,
                    'work_order_id' => $workOrder->id,
                    'project_id' => $workOrder->project_id,
                    'assigned_to_id' => $validated['assignedToId'] ?? $task->assigned_to_id,
                    'title' => $item['text'],
                    'description' => null,
                    'status' => $item['completed'] ? TaskStatus::Done : TaskStatus::Todo,
                    'due_date' => $validated['dueDate'] ?? $task->due_date,
                    'estimated_hours' => 0,
                    'checklist_items' => [],
                ]);
            }
        }

        // Handle the original task
        match ($validated['originalTaskAction']) {
            'cancel' => $task->update(['status' => TaskStatus::Cancelled]),
            'delete' => $task->delete(),
            'keep' => null, // Do nothing
        };

        // Trigger Dispatcher Agent if enabled
        if ($dispatcherEnabled) {
            $this->triggerDispatcherAgent($workOrder);
        }

        return redirect()->route('work-orders.show', $workOrder->id);
    }

    /**
     * Trigger the Dispatcher Agent to analyze and provide routing recommendations.
     */
    private function triggerDispatcherAgent(WorkOrder $workOrder): void
    {
        // Find the Dispatcher Agent
        $dispatcherAgent = AIAgent::query()
            ->where('type', AgentType::WorkRouting)
            ->first();

        if ($dispatcherAgent === null) {
            return;
        }

        // Dispatch job to process routing asynchronously
        ProcessDispatcherRouting::dispatch($workOrder, $dispatcherAgent);
    }

    /**
     * Reorder tasks within a work order.
     */
    public function reorder(Request $request, WorkOrder $workOrder): JsonResponse
    {
        $this->authorize('update', $workOrder);

        $validated = $request->validate([
            'taskIds' => 'required|array',
            'taskIds.*' => 'exists:tasks,id',
        ]);

        foreach ($validated['taskIds'] as $index => $taskId) {
            Task::where('id', $taskId)
                ->where('work_order_id', $workOrder->id)
                ->update(['position_in_work_order' => ($index + 1) * 100]);
        }

        return response()->json(['message' => 'Tasks reordered successfully']);
    }

    /**
     * Get formatted allowed transitions for the frontend.
     *
     * @return array<int, array{value: string, label: string, destructive?: bool}>
     */
    private function getFormattedAllowedTransitions(Task $task, $user): array
    {
        $availableTransitions = $this->transitionService->getAvailableTransitions($task, $user);

        $transitionLabels = [
            'in_progress' => ['label' => 'Start Working', 'destructive' => false],
            'in_review' => ['label' => 'Submit for Review', 'destructive' => false],
            'approved' => ['label' => 'Approve', 'destructive' => false],
            'done' => ['label' => 'Mark as Done', 'destructive' => false],
            'blocked' => ['label' => 'Mark as Blocked', 'destructive' => false],
            'cancelled' => ['label' => 'Cancel', 'destructive' => true],
            'revision_requested' => ['label' => 'Request Changes', 'destructive' => false],
        ];

        return array_map(
            fn (string $status) => [
                'value' => $status,
                'label' => $transitionLabels[$status]['label'] ?? ucwords(str_replace('_', ' ', $status)),
                'destructive' => $transitionLabels[$status]['destructive'] ?? false,
            ],
            $availableTransitions
        );
    }

    /**
     * Get rejection feedback if the task was recently sent back for revisions.
     *
     * @return array{comment: string, user: array{id: int, name: string, email: string}, createdAt: string}|null
     */
    private function getRejectionFeedback(Task $task): ?array
    {
        // Only show feedback if current status is InProgress
        if ($task->status !== TaskStatus::InProgress) {
            return null;
        }

        // Find the most recent revision_requested transition
        $revisionTransition = $task->statusTransitions
            ->filter(fn ($t) => $t->to_status === 'revision_requested' && $t->comment !== null)
            ->sortByDesc('created_at')
            ->first();

        if ($revisionTransition === null) {
            return null;
        }

        // Check if there's a transition from revision_requested to in_progress after the rejection
        $autoTransition = $task->statusTransitions
            ->filter(fn ($t) => $t->from_status === 'revision_requested' && $t->to_status === 'in_progress')
            ->sortByDesc('created_at')
            ->first();

        // Only show if the revision happened and auto-transitioned to in_progress
        if ($autoTransition === null || $autoTransition->created_at < $revisionTransition->created_at) {
            return null;
        }

        return [
            'comment' => $revisionTransition->comment,
            'user' => [
                'id' => $revisionTransition->user?->id ?? 0,
                'name' => $revisionTransition->user?->name ?? 'Unknown',
                'email' => $revisionTransition->user?->email ?? '',
            ],
            'createdAt' => $revisionTransition->created_at->toIso8601String(),
        ];
    }
}
