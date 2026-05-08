<?php

namespace App\Http\Controllers\Work;

use App\Enums\DocumentType;
use App\Enums\Priority;
use App\Enums\WorkOrderStatus;
use App\Http\Controllers\Controller;
use App\Models\AIAgent;
use App\Models\Document;
use App\Models\Folder;
use App\Models\Message;
use App\Models\Project;
use App\Models\Task;
use App\Models\WorkOrder;
use App\Models\WorkOrderList;
use App\Services\WorkflowTransitionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class WorkOrderController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'projectId' => 'required|exists:projects,id',
            'assignedToId' => 'nullable|exists:users,id',
            'priority' => 'required|string|in:low,medium,high,urgent',
            'dueDate' => 'nullable|date',
            'estimatedHours' => 'nullable|numeric|min:0',
            'acceptanceCriteria' => 'nullable|array',
            'workOrderListId' => 'nullable|exists:work_order_lists,id',
        ]);

        $user = $request->user();
        $team = $user->currentTeam;
        $project = Project::findOrFail($validated['projectId']);

        // Calculate position in list
        $listId = $validated['workOrderListId'] ?? null;
        $positionInList = 0;
        if ($listId) {
            $maxPosition = WorkOrder::where('work_order_list_id', $listId)->max('position_in_list') ?? 0;
            $positionInList = $maxPosition + 100;
        } else {
            $maxPosition = WorkOrder::where('project_id', $validated['projectId'])
                ->whereNull('work_order_list_id')
                ->max('position_in_list') ?? 0;
            $positionInList = $maxPosition + 100;
        }

        WorkOrder::create([
            'team_id' => $team->id,
            'project_id' => $validated['projectId'],
            'work_order_list_id' => $listId,
            'position_in_list' => $positionInList,
            'assigned_to_id' => $validated['assignedToId'] ?? null,
            'created_by_id' => $user->id,
            'party_contact_id' => $project->party_id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => WorkOrderStatus::Draft,
            'priority' => Priority::from($validated['priority']),
            'due_date' => $validated['dueDate'] ?? null,
            'estimated_hours' => $validated['estimatedHours'] ?? 0,
            'acceptance_criteria' => $validated['acceptanceCriteria'] ?? [],
            'accountable_id' => $user->id, // Creator is initially accountable (RACI)
        ]);

        return back();
    }

    public function show(Request $request, WorkOrder $workOrder, WorkflowTransitionService $transitionService): Response
    {
        $this->authorize('view', $workOrder);

        $workOrder->load(['project', 'workOrderList', 'assignedTo', 'createdBy', 'tasks.assignedAgent', 'tasks.assignedTo', 'deliverables', 'documents', 'statusTransitions.user', 'statusTransitions.fromAssignedTo', 'statusTransitions.toAssignedTo', 'statusTransitions.fromAssignedAgent', 'statusTransitions.toAssignedAgent', 'accountable', 'responsible']);

        // Get communication thread and messages
        $thread = $workOrder->communicationThread;
        $messages = $thread ? $thread->messages()->with('author')->orderBy('created_at', 'desc')->get() : collect();

        // Get allowed transitions for current user
        $allowedTransitions = $this->getFormattedAllowedTransitions($workOrder, $request->user(), $transitionService);

        // Get rejection feedback if applicable
        $rejectionFeedback = $this->getRejectionFeedback($workOrder);

        // Get routing recommendations from metadata if dispatcher was enabled
        $routingRecommendations = $this->getRoutingRecommendations($workOrder);

        // Sibling data for breadcrumb navigation
        $siblingProjects = Project::forTeam($workOrder->project->team_id)
            ->notArchived()
            ->visibleTo($request->user()->id)
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        $siblingWorkOrders = WorkOrder::where('project_id', $workOrder->project_id)
            ->notArchived()
            ->select('id', 'title')
            ->orderBy('title')
            ->get();

        $siblingLists = WorkOrderList::forProject($workOrder->project_id)
            ->ordered()
            ->select('id', 'name')
            ->get();

        return Inertia::render('work/work-orders/[id]', [
            'siblingProjects' => $siblingProjects->map(fn (Project $p) => [
                'id' => (string) $p->id,
                'name' => $p->name,
            ]),
            'siblingWorkOrders' => $siblingWorkOrders->map(fn (WorkOrder $wo) => [
                'id' => (string) $wo->id,
                'title' => $wo->title,
            ]),
            'siblingLists' => $siblingLists->map(fn (WorkOrderList $list) => [
                'id' => (string) $list->id,
                'name' => $list->name,
            ]),
            'workOrder' => [
                'id' => (string) $workOrder->id,
                'title' => $workOrder->title,
                'description' => $workOrder->description,
                'projectId' => (string) $workOrder->project_id,
                'projectName' => $workOrder->project?->name ?? 'Unknown',
                'workOrderListId' => $workOrder->work_order_list_id ? (string) $workOrder->work_order_list_id : null,
                'workOrderListName' => $workOrder->workOrderList?->name,
                'assignedToId' => $workOrder->assigned_to_id ? (string) $workOrder->assigned_to_id : null,
                'assignedToName' => $workOrder->assignedTo?->name ?? 'Unassigned',
                'status' => $workOrder->status->value,
                'priority' => $workOrder->priority->value,
                'dueDate' => $workOrder->due_date?->format('Y-m-d'),
                'estimatedHours' => (float) $workOrder->estimated_hours,
                'actualHours' => (float) $workOrder->actual_hours,
                'acceptanceCriteria' => $workOrder->acceptance_criteria ?? [],
                'sopAttached' => $workOrder->sop_attached,
                'sopName' => $workOrder->sop_name,
                'createdBy' => (string) $workOrder->created_by_id,
                'createdByName' => $workOrder->createdBy?->name ?? 'Unknown',
                'accountableId' => $workOrder->accountable_id,
                'accountableName' => $workOrder->accountable?->name,
                'responsibleId' => $workOrder->responsible_id,
                'responsibleName' => $workOrder->responsible?->name,
                'reviewerId' => $workOrder->reviewer_id ?? null,
                'consultedIds' => $workOrder->consulted_ids ?? [],
                'informedIds' => $workOrder->informed_ids ?? [],
            ],
            'tasks' => $workOrder->tasks()->ordered()->with(['assignedTo', 'assignedAgent'])->get()->map(fn (Task $task) => [
                'id' => (string) $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'status' => $task->status->value,
                'dueDate' => $task->due_date?->format('Y-m-d'),
                'assignedToId' => $task->assigned_to_id ? (string) $task->assigned_to_id : null,
                'assignedToName' => $task->assignedTo?->name ?? 'Unassigned',
                'assignedAgentId' => $task->assigned_agent_id ? (string) $task->assigned_agent_id : null,
                'assignedAgentName' => $task->assignedAgent?->name ?? null,
                'estimatedHours' => (float) $task->estimated_hours,
                'actualHours' => (float) $task->actual_hours,
                'checklistItems' => $task->checklist_items ?? [],
                'isBlocked' => $task->is_blocked,
                'positionInWorkOrder' => $task->position_in_work_order,
            ]),
            'deliverables' => $workOrder->deliverables->map(fn ($del) => [
                'id' => (string) $del->id,
                'title' => $del->title,
                'description' => $del->description,
                'type' => $del->type->value,
                'status' => $del->status->value,
                'version' => $del->version,
                'createdDate' => $del->created_date->format('Y-m-d'),
                'deliveredDate' => $del->delivered_date?->format('Y-m-d'),
                'fileUrl' => $del->file_url,
                'acceptanceCriteria' => $del->acceptance_criteria ?? [],
            ]),
            'documents' => $workOrder->documents->map(fn (Document $doc) => [
                'id' => (string) $doc->id,
                'name' => $doc->name,
                'type' => $doc->type->value,
                'fileUrl' => $doc->file_url,
                'fileSize' => $doc->file_size,
                'mimeType' => $this->guessMimeType($doc->name),
                'folderId' => $doc->folder_id ? (string) $doc->folder_id : null,
                'uploadedDate' => $doc->created_at->format('Y-m-d'),
            ]),
            'folders' => $this->getWorkOrderFolders($workOrder),
            'communicationThread' => $thread ? [
                'id' => (string) $thread->id,
                'messageCount' => $thread->message_count,
            ] : null,
            'messages' => $messages->map(fn (Message $msg) => [
                'id' => (string) $msg->id,
                'authorId' => (string) $msg->author_id,
                'authorName' => $msg->author?->name ?? 'Unknown',
                'authorType' => $msg->author_type->value,
                'timestamp' => $msg->created_at->toIso8601String(),
                'content' => $msg->content,
                'type' => $msg->type->value,
            ]),
            'teamMembers' => $workOrder->project->team->users
                ->push($workOrder->project->team->owner)
                ->push($request->user())
                ->unique('id')
                ->filter()
                ->values()
                ->map(fn ($user) => [
                    'id' => (string) $user->id,
                    'name' => $user->name,
                ]),
            'availableAgents' => AIAgent::whereHas('configurations', fn ($q) => $q->where('team_id', $workOrder->team_id)->where('enabled', true))->get()->map(fn (AIAgent $a) => [
                'id' => (string) $a->id,
                'name' => $a->name,
                'type' => $a->type->value,
            ]),
            'statusTransitions' => $workOrder->statusTransitions->map(fn ($transition) => [
                'id' => $transition->id,
                'actionType' => $transition->action_type ?? 'status_change',
                'fromStatus' => $transition->from_status,
                'toStatus' => $transition->to_status,
                'user' => $transition->user ? [
                    'id' => $transition->user->id,
                    'name' => $transition->user->name,
                    'email' => $transition->user->email,
                ] : null,
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
                'createdAt' => $transition->created_at->toIso8601String(),
                'comment' => $transition->comment,
                'commentCategory' => null,
            ]),
            'allowedTransitions' => $allowedTransitions,
            'raciValue' => [
                'responsible_id' => $workOrder->responsible_id,
                'accountable_id' => $workOrder->accountable_id,
                'consulted_ids' => $workOrder->consulted_ids ?? [],
                'informed_ids' => $workOrder->informed_ids ?? [],
            ],
            'rejectionFeedback' => $rejectionFeedback,
            'routingRecommendations' => $routingRecommendations,
        ]);
    }

    /**
     * Get formatted allowed transitions for the frontend.
     */
    private function getFormattedAllowedTransitions(WorkOrder $workOrder, $user, WorkflowTransitionService $transitionService): array
    {
        $transitions = $transitionService->getAvailableTransitions($workOrder, $user);

        $labels = [
            'draft' => 'Set as Draft',
            'active' => 'Start Work Order',
            'in_review' => 'Submit for Review',
            'approved' => 'Approve',
            'delivered' => 'Mark as Delivered',
            'blocked' => 'Mark as Blocked',
            'cancelled' => 'Cancel',
            'revision_requested' => 'Request Changes',
        ];

        $destructive = ['cancelled', 'revision_requested'];

        return collect($transitions)->map(fn ($status) => [
            'value' => $status,
            'label' => $labels[$status] ?? ucfirst(str_replace('_', ' ', $status)),
            'destructive' => in_array($status, $destructive),
        ])->values()->all();
    }

    /**
     * Get rejection feedback if the work order was recently rejected.
     */
    private function getRejectionFeedback(WorkOrder $workOrder): ?array
    {
        if ($workOrder->status !== WorkOrderStatus::Active) {
            return null;
        }

        $lastTransition = $workOrder->statusTransitions()
            ->where('to_status', 'revision_requested')
            ->with('user')
            ->orderByDesc('created_at')
            ->first();

        if (! $lastTransition || ! $lastTransition->comment) {
            return null;
        }

        return [
            'comment' => $lastTransition->comment,
            'user' => [
                'id' => $lastTransition->user?->id,
                'name' => $lastTransition->user?->name ?? 'Unknown',
                'email' => $lastTransition->user?->email ?? '',
            ],
            'createdAt' => $lastTransition->created_at->toIso8601String(),
        ];
    }

    /**
     * Get routing recommendations from work order metadata.
     *
     * @return array<string, mixed>|null
     */
    private function getRoutingRecommendations(WorkOrder $workOrder): ?array
    {
        $metadata = $workOrder->metadata ?? [];

        // Check if dispatcher was enabled and recommendations exist
        if (! ($metadata['dispatcher_enabled'] ?? false)) {
            return null;
        }

        $recommendations = $metadata['routing_recommendations'] ?? null;

        if ($recommendations === null) {
            // Dispatcher was enabled but recommendations not yet generated
            return [
                'status' => 'processing',
                'candidates' => [],
            ];
        }

        // Check for error state
        if ($recommendations['error'] ?? false) {
            return [
                'status' => 'error',
                'errorMessage' => $recommendations['error_message'] ?? 'Failed to generate recommendations',
                'candidates' => [],
            ];
        }

        return [
            'status' => 'completed',
            'generatedAt' => $recommendations['generated_at'] ?? null,
            'candidates' => $recommendations['candidates'] ?? [],
            'topCandidateId' => $recommendations['top_candidate_id'] ?? null,
            'confidence' => $recommendations['confidence'] ?? 'low',
        ];
    }

    public function uploadFile(Request $request, WorkOrder $workOrder): RedirectResponse
    {
        $this->authorize('update', $workOrder);

        $validated = $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
            'folder_id' => 'nullable|exists:folders,id',
        ]);

        $user = $request->user();
        $file = $validated['file'];
        $fileName = $file->getClientOriginalName();
        $fileSize = $file->getSize();

        // Store file in work-orders directory
        $path = $file->store("work-orders/{$workOrder->id}", 'public');
        $fileUrl = Storage::disk('public')->url($path);

        // Create document record
        Document::create([
            'team_id' => $workOrder->team_id,
            'uploaded_by_id' => $user->id,
            'documentable_type' => WorkOrder::class,
            'documentable_id' => $workOrder->id,
            'folder_id' => $validated['folder_id'] ?? null,
            'name' => $fileName,
            'type' => DocumentType::Reference,
            'file_url' => $fileUrl,
            'file_size' => $this->formatFileSize($fileSize),
        ]);

        return back();
    }

    public function deleteFile(Request $request, WorkOrder $workOrder, Document $document): RedirectResponse
    {
        $this->authorize('update', $workOrder);

        // Verify document belongs to this work order
        if ($document->documentable_type !== WorkOrder::class || $document->documentable_id !== $workOrder->id) {
            abort(403);
        }

        // Delete file from storage
        $path = str_replace(Storage::disk('public')->url(''), '', $document->file_url);
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }

        $document->delete();

        return back();
    }

    private function formatFileSize(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $unitIndex = 0;
        $size = $bytes;

        while ($size >= 1024 && $unitIndex < count($units) - 1) {
            $size /= 1024;
            $unitIndex++;
        }

        return round($size, 1).' '.$units[$unitIndex];
    }

    private function guessMimeType(string $filename): string
    {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        $mimeTypes = [
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls' => 'application/vnd.ms-excel',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'txt' => 'text/plain',
            'zip' => 'application/zip',
        ];

        return $mimeTypes[$ext] ?? 'application/octet-stream';
    }

    private function getWorkOrderFolders(WorkOrder $workOrder): array
    {
        // Reuse folders from the parent project
        $folders = Folder::forTeam($workOrder->team_id)
            ->where('project_id', $workOrder->project_id)
            ->whereNull('parent_id')
            ->with(['children.children'])
            ->withCount('documents')
            ->orderBy('name')
            ->get();

        return $folders->map(fn (Folder $folder) => [
            'id' => (string) $folder->id,
            'name' => $folder->name,
            'parentId' => $folder->parent_id ? (string) $folder->parent_id : null,
            'documentCount' => $folder->documents_count,
            'children' => $folder->children->map(fn (Folder $child) => [
                'id' => (string) $child->id,
                'name' => $child->name,
                'parentId' => (string) $child->parent_id,
                'documentCount' => $child->documents_count ?? 0,
                'children' => [],
            ])->toArray(),
        ])->toArray();
    }

    public function archive(Request $request, WorkOrder $workOrder): RedirectResponse
    {
        $this->authorize('update', $workOrder);

        $workOrder->update(['status' => WorkOrderStatus::Archived]);

        // Recalculate project progress
        $workOrder->project->recalculateProgress();

        return back();
    }

    public function restore(Request $request, WorkOrder $workOrder): RedirectResponse
    {
        $this->authorize('update', $workOrder);

        $workOrder->update(['status' => WorkOrderStatus::Active]);

        // Recalculate project progress
        $workOrder->project->recalculateProgress();

        return back();
    }

    public function bulkArchiveDelivered(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $project->workOrders()
            ->where('status', WorkOrderStatus::Delivered)
            ->update(['status' => WorkOrderStatus::Archived]);

        // Recalculate project progress
        $project->recalculateProgress();

        return back();
    }

    public function update(Request $request, WorkOrder $workOrder): RedirectResponse
    {
        $this->authorize('update', $workOrder);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'assignedToId' => 'nullable|exists:users,id',
            'priority' => 'sometimes|required|string|in:low,medium,high,urgent',
            'due_date' => 'nullable|date',
            'estimated_hours' => 'nullable|numeric|min:0',
            'acceptanceCriteria' => 'nullable|array',
        ]);

        $updateData = [];
        if (isset($validated['title'])) {
            $updateData['title'] = $validated['title'];
        }
        if (array_key_exists('description', $validated)) {
            $updateData['description'] = $validated['description'];
        }
        if (array_key_exists('assignedToId', $validated)) {
            $updateData['assigned_to_id'] = $validated['assignedToId'];
        }
        if (isset($validated['priority'])) {
            $updateData['priority'] = Priority::from($validated['priority']);
        }
        if (array_key_exists('due_date', $validated)) {
            $updateData['due_date'] = $validated['due_date'];
        }
        if (array_key_exists('estimated_hours', $validated)) {
            $updateData['estimated_hours'] = $validated['estimated_hours'] ?? 0;
        }
        if (isset($validated['acceptanceCriteria'])) {
            $updateData['acceptance_criteria'] = $validated['acceptanceCriteria'];
        }

        $workOrder->update($updateData);

        return back();
    }

    public function destroy(Request $request, WorkOrder $workOrder): RedirectResponse
    {
        $this->authorize('delete', $workOrder);

        $workOrder->delete();

        return redirect()->route('projects.show', $workOrder->project_id);
    }

    public function updateStatus(Request $request, WorkOrder $workOrder): RedirectResponse
    {
        $this->authorize('update', $workOrder);

        $validated = $request->validate([
            'status' => 'required|string|in:draft,active,in_review,approved,delivered',
        ]);

        $workOrder->update([
            'status' => WorkOrderStatus::from($validated['status']),
        ]);

        return back();
    }

    /**
     * Accept a routing recommendation and assign the work order.
     */
    public function acceptRoutingRecommendation(Request $request, WorkOrder $workOrder): RedirectResponse
    {
        $this->authorize('update', $workOrder);

        $validated = $request->validate([
            'userId' => 'required|exists:users,id',
        ]);

        // Update the responsible assignment
        $workOrder->update([
            'responsible_id' => $validated['userId'],
        ]);

        // Clear the routing recommendation from metadata since it's been acted upon
        $metadata = $workOrder->metadata ?? [];
        if (isset($metadata['routing_recommendations'])) {
            $metadata['routing_recommendations']['accepted'] = true;
            $metadata['routing_recommendations']['accepted_user_id'] = $validated['userId'];
            $metadata['routing_recommendations']['accepted_at'] = now()->toIso8601String();
            $workOrder->update(['metadata' => $metadata]);
        }

        return back();
    }
}
