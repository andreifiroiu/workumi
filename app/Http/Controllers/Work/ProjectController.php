<?php

namespace App\Http\Controllers\Work;

use App\Enums\DocumentType;
use App\Enums\ProjectStatus;
use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Folder;
use App\Models\Message;
use App\Models\Party;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderList;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Project::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'partyId' => 'required|exists:parties,id',
            'startDate' => 'required|date',
            'targetEndDate' => 'nullable|date|after_or_equal:startDate',
            'budgetHours' => 'nullable|numeric|min:0',
            'tags' => 'nullable|array',
            'isPrivate' => 'nullable|boolean',
        ]);

        $user = $request->user();
        $team = $user->currentTeam;

        Project::create([
            'team_id' => $team->id,
            'party_id' => $validated['partyId'],
            'owner_id' => $user->id,
            'accountable_id' => $user->id, // Owner is initially accountable (RACI)
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'status' => ProjectStatus::Active,
            'start_date' => $validated['startDate'],
            'target_end_date' => $validated['targetEndDate'] ?? null,
            'budget_hours' => $validated['budgetHours'] ?? null,
            'tags' => $validated['tags'] ?? [],
            'is_private' => $validated['isPrivate'] ?? false,
        ]);

        return back();
    }

    public function show(Request $request, Project $project): Response
    {
        $this->authorize('view', $project);

        $user = $request->user();

        $project->load([
            'party', 'owner', 'accountable', 'responsible',
            'workOrders.tasks', 'workOrders.deliverables',
            'workOrders.assignedTo', 'workOrders.accountable',
            'workOrders.responsible', 'workOrders.reviewer',
            'workOrders.tasks.assignedTo', 'workOrders.tasks.reviewer',
            'documents',
            'workOrderLists.workOrders.tasks',
            'workOrderLists.workOrders.accountable',
        ]);

        // Get communication thread and messages
        $thread = $project->communicationThread;
        $messages = $thread ? $thread->messages()->with('author')->orderBy('created_at', 'desc')->get() : collect();

        // Sibling projects for breadcrumb navigation
        $siblingProjects = Project::forTeam($project->team_id)
            ->notArchived()
            ->visibleTo($user->id)
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('work/projects/[id]', [
            'siblingProjects' => $siblingProjects->map(fn (Project $p) => [
                'id' => (string) $p->id,
                'name' => $p->name,
            ]),
            'project' => [
                'id' => (string) $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'partyId' => (string) $project->party_id,
                'partyName' => $project->party?->name ?? 'Unknown',
                'ownerId' => (string) $project->owner_id,
                'ownerName' => $project->owner?->name ?? 'Unknown',
                'status' => $project->status->value,
                'startDate' => $project->start_date->format('Y-m-d'),
                'targetEndDate' => $project->target_end_date?->format('Y-m-d'),
                'budgetHours' => (float) $project->budget_hours,
                'actualHours' => (float) $project->actual_hours,
                'progress' => $project->progress,
                'tags' => $project->tags ?? [],
                'isPrivate' => $project->is_private,
                'canTogglePrivacy' => $user->id === $project->owner_id,
            ],
            'workOrders' => $project->workOrders->map(fn (WorkOrder $wo) => [
                'id' => (string) $wo->id,
                'title' => $wo->title,
                'status' => $wo->status->value,
                'priority' => $wo->priority->value,
                'dueDate' => $wo->due_date?->format('Y-m-d'),
                'assignedToName' => $wo->accountable?->name ?? 'Unassigned',
                'tasksCount' => $wo->tasks->count(),
                'completedTasksCount' => $wo->tasks->where('status', 'done')->count(),
                'workOrderListId' => $wo->work_order_list_id ? (string) $wo->work_order_list_id : null,
                'positionInList' => $wo->position_in_list,
            ]),
            'workOrderLists' => $project->workOrderLists->map(fn (WorkOrderList $list) => [
                'id' => (string) $list->id,
                'name' => $list->name,
                'description' => $list->description,
                'color' => $list->color,
                'position' => $list->position,
                'workOrders' => $list->workOrders->map(fn (WorkOrder $wo) => [
                    'id' => (string) $wo->id,
                    'title' => $wo->title,
                    'status' => $wo->status->value,
                    'priority' => $wo->priority->value,
                    'dueDate' => $wo->due_date?->format('Y-m-d'),
                    'assignedToName' => $wo->accountable?->name ?? 'Unassigned',
                    'tasksCount' => $wo->tasks->count(),
                    'completedTasksCount' => $wo->tasks->where('status', 'done')->count(),
                    'positionInList' => $wo->position_in_list,
                ]),
            ]),
            'ungroupedWorkOrders' => $project->ungroupedWorkOrders()
                ->with(['tasks', 'accountable'])
                ->get()
                ->map(fn (WorkOrder $wo) => [
                    'id' => (string) $wo->id,
                    'title' => $wo->title,
                    'status' => $wo->status->value,
                    'priority' => $wo->priority->value,
                    'dueDate' => $wo->due_date?->format('Y-m-d'),
                    'assignedToName' => $wo->accountable?->name ?? 'Unassigned',
                    'tasksCount' => $wo->tasks->count(),
                    'completedTasksCount' => $wo->tasks->where('status', 'done')->count(),
                    'positionInList' => $wo->position_in_list,
                ]),
            'documents' => $project->documents->map(fn (Document $doc) => [
                'id' => (string) $doc->id,
                'name' => $doc->name,
                'type' => $doc->type->value,
                'fileUrl' => $doc->file_url,
                'fileSize' => $doc->file_size,
                'mimeType' => $this->guessMimeType($doc->name),
                'folderId' => $doc->folder_id ? (string) $doc->folder_id : null,
                'uploadedDate' => $doc->created_at->format('Y-m-d'),
            ]),
            'folders' => $this->getProjectFolders($project),
            'communicationThread' => $thread ? [
                'id' => (string) $thread->id,
                'messageCount' => $thread->message_count,
                'lastActivity' => $thread->last_activity?->toIso8601String(),
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
            'parties' => Party::forTeam($project->team_id)->get()->map(fn (Party $p) => [
                'id' => (string) $p->id,
                'name' => $p->name,
            ]),
            'teamMembers' => $this->aggregateProjectTeamMembers($project),
        ]);
    }

    public function update(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'partyId' => 'sometimes|required|exists:parties,id',
            'status' => 'sometimes|required|string|in:active,on_hold,completed,archived',
            'startDate' => 'sometimes|required|date',
            'targetEndDate' => 'nullable|date|after_or_equal:startDate',
            'budgetHours' => 'nullable|numeric|min:0',
            'tags' => 'nullable|array',
            'isPrivate' => 'nullable|boolean',
        ]);

        $updateData = [];
        if (isset($validated['name'])) {
            $updateData['name'] = $validated['name'];
        }
        if (array_key_exists('description', $validated)) {
            $updateData['description'] = $validated['description'];
        }
        if (isset($validated['partyId'])) {
            $updateData['party_id'] = $validated['partyId'];
        }
        if (isset($validated['status'])) {
            $updateData['status'] = ProjectStatus::from($validated['status']);
        }
        if (isset($validated['startDate'])) {
            $updateData['start_date'] = $validated['startDate'];
        }
        if (array_key_exists('targetEndDate', $validated)) {
            $updateData['target_end_date'] = $validated['targetEndDate'];
        }
        if (array_key_exists('budgetHours', $validated)) {
            $updateData['budget_hours'] = $validated['budgetHours'];
        }
        if (isset($validated['tags'])) {
            $updateData['tags'] = $validated['tags'];
        }
        if (array_key_exists('isPrivate', $validated)) {
            $this->authorize('togglePrivacy', $project);
            $updateData['is_private'] = $validated['isPrivate'];
        }

        $project->update($updateData);

        return back();
    }

    public function destroy(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('delete', $project);

        $project->delete();

        return redirect()->route('work');
    }

    public function archive(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $project->update(['status' => ProjectStatus::Archived]);

        return back();
    }

    public function restore(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $project->update(['status' => ProjectStatus::Active]);

        return back();
    }

    public function uploadFile(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
            'folder_id' => 'nullable|exists:folders,id',
        ]);

        $user = $request->user();
        $file = $validated['file'];
        $fileName = $file->getClientOriginalName();
        $fileSize = $file->getSize();

        // Store file in projects directory
        $path = $file->store("projects/{$project->id}", 'public');
        $fileUrl = Storage::disk('public')->url($path);

        // Create document record
        Document::create([
            'team_id' => $project->team_id,
            'uploaded_by_id' => $user->id,
            'documentable_type' => Project::class,
            'documentable_id' => $project->id,
            'folder_id' => $validated['folder_id'] ?? null,
            'name' => $fileName,
            'type' => DocumentType::Reference,
            'file_url' => $fileUrl,
            'file_size' => $this->formatFileSize($fileSize),
        ]);

        return back();
    }

    public function deleteFile(Request $request, Project $project, Document $document): RedirectResponse
    {
        $this->authorize('update', $project);

        // Verify document belongs to this project
        if ($document->documentable_type !== Project::class || $document->documentable_id !== $project->id) {
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

    /**
     * Guess MIME type from filename extension.
     */
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

    /**
     * Get project-scoped folders formatted for the frontend.
     *
     * @return array<int, array<string, mixed>>
     */
    private function getProjectFolders(Project $project): array
    {
        $folders = Folder::forTeam($project->team_id)
            ->where('project_id', $project->id)
            ->whereNull('parent_id')
            ->with(['children.children'])
            ->withCount('documents')
            ->orderBy('name')
            ->get();

        return $folders->map(fn (Folder $folder) => $this->formatFolder($folder))->toArray();
    }

    /**
     * Format a single folder with its children.
     *
     * @return array<string, mixed>
     */
    private function formatFolder(Folder $folder): array
    {
        return [
            'id' => (string) $folder->id,
            'name' => $folder->name,
            'projectId' => $folder->project_id ? (string) $folder->project_id : null,
            'parentId' => $folder->parent_id ? (string) $folder->parent_id : null,
            'depth' => $folder->depth(),
            'canHaveChildren' => $folder->canHaveChildren(),
            'documentsCount' => $folder->documents_count ?? $folder->documents()->count(),
            'children' => $folder->children->map(fn (Folder $child) => $this->formatFolder($child))->toArray(),
        ];
    }

    /**
     * Aggregate all team members from project, work orders, and tasks.
     *
     * @return array<int, array{id: string, name: string, email: string, avatarUrl: string|null, roles: array, workload: array}>
     */
    private function aggregateProjectTeamMembers(Project $project): array
    {
        $userRoles = []; // userId => ['roles' => [], 'workOrdersCount' => 0, 'tasksCount' => 0, 'totalEstimatedHours' => 0]

        // Helper to add a role for a user
        $addRole = function (?int $userId, string $role, string $scope, string $scopeTitle) use (&$userRoles) {
            if (! $userId) {
                return;
            }

            if (! isset($userRoles[$userId])) {
                $userRoles[$userId] = [
                    'roles' => [],
                    'workOrdersCount' => 0,
                    'tasksCount' => 0,
                    'totalEstimatedHours' => 0,
                ];
            }

            // Avoid duplicate roles with same scope and scopeTitle
            $roleKey = "{$role}:{$scope}:{$scopeTitle}";
            if (! isset($userRoles[$userId]['roleKeys'][$roleKey])) {
                $userRoles[$userId]['roles'][] = [
                    'role' => $role,
                    'scope' => $scope,
                    'scopeTitle' => $scopeTitle,
                ];
                $userRoles[$userId]['roleKeys'][$roleKey] = true;
            }
        };

        // Project-level RACI
        $addRole($project->owner_id, 'owner', 'project', $project->name);
        $addRole($project->accountable_id, 'accountable', 'project', $project->name);
        $addRole($project->responsible_id, 'responsible', 'project', $project->name);

        // Consulted and informed (arrays of user IDs)
        foreach ($project->consulted_ids ?? [] as $userId) {
            $addRole((int) $userId, 'consulted', 'project', $project->name);
        }
        foreach ($project->informed_ids ?? [] as $userId) {
            $addRole((int) $userId, 'informed', 'project', $project->name);
        }

        // Work Orders
        foreach ($project->workOrders as $wo) {
            $addRole($wo->assigned_to_id, 'assigned', 'work_order', $wo->title);
            $addRole($wo->accountable_id, 'accountable', 'work_order', $wo->title);
            $addRole($wo->responsible_id, 'responsible', 'work_order', $wo->title);
            $addRole($wo->reviewer_id, 'reviewer', 'work_order', $wo->title);

            foreach ($wo->consulted_ids ?? [] as $userId) {
                $addRole((int) $userId, 'consulted', 'work_order', $wo->title);
            }
            foreach ($wo->informed_ids ?? [] as $userId) {
                $addRole((int) $userId, 'informed', 'work_order', $wo->title);
            }

            // Track workload for assigned user
            if ($wo->assigned_to_id) {
                $userRoles[$wo->assigned_to_id]['workOrdersCount']++;
                $userRoles[$wo->assigned_to_id]['totalEstimatedHours'] += (float) $wo->estimated_hours;
            }

            // Tasks
            foreach ($wo->tasks as $task) {
                $addRole($task->assigned_to_id, 'assigned', 'task', $task->title);
                $addRole($task->reviewer_id, 'reviewer', 'task', $task->title);

                // Track workload for assigned user
                if ($task->assigned_to_id) {
                    if (! isset($userRoles[$task->assigned_to_id])) {
                        $userRoles[$task->assigned_to_id] = [
                            'roles' => [],
                            'workOrdersCount' => 0,
                            'tasksCount' => 0,
                            'totalEstimatedHours' => 0,
                        ];
                    }
                    $userRoles[$task->assigned_to_id]['tasksCount']++;
                    $userRoles[$task->assigned_to_id]['totalEstimatedHours'] += (float) $task->estimated_hours;
                }
            }
        }

        // Now fetch all users
        $userIds = array_keys($userRoles);
        if (empty($userIds)) {
            return [];
        }

        $users = User::whereIn('id', $userIds)->get()->keyBy('id');

        $result = [];
        foreach ($userRoles as $userId => $data) {
            $user = $users->get($userId);
            if (! $user) {
                continue;
            }

            // Remove the roleKeys helper from the data
            unset($data['roleKeys']);

            $result[] = [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatarUrl' => $user->profile_photo_url ?? null,
                'roles' => $data['roles'],
                'workload' => [
                    'workOrdersCount' => $data['workOrdersCount'],
                    'tasksCount' => $data['tasksCount'],
                    'totalEstimatedHours' => $data['totalEstimatedHours'],
                ],
            ];
        }

        // Sort by number of roles (most involved first)
        usort($result, fn ($a, $b) => count($b['roles']) <=> count($a['roles']));

        return $result;
    }
}
