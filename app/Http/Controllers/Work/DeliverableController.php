<?php

declare(strict_types=1);

namespace App\Http\Controllers\Work;

use App\Enums\DeliverableStatus;
use App\Enums\DeliverableType;
use App\Enums\DocumentType;
use App\Http\Controllers\Controller;
use App\Models\Deliverable;
use App\Models\DeliverableVersion;
use App\Models\Document;
use App\Models\StatusTransition;
use App\Models\User;
use App\Models\WorkOrder;
use App\Notifications\DeliverableStatusChangedNotification;
use App\Services\FileUploadService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DeliverableController extends Controller
{
    public function __construct(
        private readonly FileUploadService $fileUploadService
    ) {}

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'workOrderId' => 'required|exists:work_orders,id',
            'type' => 'required|string|in:document,design,report,code,other',
            'fileUrl' => 'nullable|string|url',
            'acceptanceCriteria' => 'nullable|array',
        ]);

        $user = $request->user();
        $team = $user->currentTeam;
        $workOrder = WorkOrder::findOrFail($validated['workOrderId']);

        Deliverable::create([
            'team_id' => $team->id,
            'work_order_id' => $validated['workOrderId'],
            'project_id' => $workOrder->project_id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'type' => DeliverableType::from($validated['type']),
            'status' => DeliverableStatus::Draft,
            'version' => '1.0',
            'created_date' => now(),
            'file_url' => $validated['fileUrl'] ?? null,
            'acceptance_criteria' => $validated['acceptanceCriteria'] ?? [],
        ]);

        return back();
    }

    public function show(Request $request, Deliverable $deliverable): Response
    {
        $this->authorize('view', $deliverable);

        $deliverable->load([
            'workOrder',
            'project',
            'documents',
            'versions' => fn ($query) => $query->latestFirst()->with('uploadedBy'),
            'latestVersion.uploadedBy',
        ]);

        $latestVersion = $deliverable->latestVersion;

        return Inertia::render('work/deliverables/[id]', [
            'deliverable' => [
                'id' => (string) $deliverable->id,
                'title' => $deliverable->title,
                'description' => $deliverable->description,
                'workOrderId' => (string) $deliverable->work_order_id,
                'workOrderTitle' => $deliverable->workOrder?->title ?? 'Unknown',
                'projectId' => (string) $deliverable->project_id,
                'projectName' => $deliverable->project?->name ?? 'Unknown',
                'type' => $deliverable->type->value,
                'status' => $deliverable->status->value,
                'version' => $deliverable->version,
                'createdDate' => $deliverable->created_date->format('Y-m-d'),
                'deliveredDate' => $deliverable->delivered_date?->format('Y-m-d'),
                'fileUrl' => $deliverable->file_url,
                'acceptanceCriteria' => $deliverable->acceptance_criteria ?? [],
                'versionCount' => $deliverable->versions->count(),
                'latestVersion' => $latestVersion ? $this->formatVersionData($latestVersion) : null,
            ],
            'documents' => $deliverable->documents->map(fn (Document $doc) => [
                'id' => (string) $doc->id,
                'name' => $doc->name,
                'type' => $doc->type->value,
                'fileUrl' => $doc->file_url,
                'fileSize' => $doc->file_size,
                'uploadedAt' => $doc->created_at->format('Y-m-d H:i'),
            ]),
            'versions' => $deliverable->versions->map(fn (DeliverableVersion $version) => $this->formatVersionData($version)),
        ]);
    }

    public function update(Request $request, Deliverable $deliverable): RedirectResponse
    {
        $this->authorize('update', $deliverable);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'sometimes|required|string|in:document,design,report,code,other',
            'status' => 'sometimes|required|string|in:draft,in_review,approved,delivered',
            'version' => 'sometimes|string|max:20',
            'fileUrl' => 'nullable|string|url',
            'acceptanceCriteria' => 'nullable|array',
        ]);

        $oldStatus = $deliverable->status;
        $statusChanged = false;

        $updateData = [];
        if (isset($validated['title'])) {
            $updateData['title'] = $validated['title'];
        }
        if (array_key_exists('description', $validated)) {
            $updateData['description'] = $validated['description'];
        }
        if (isset($validated['type'])) {
            $updateData['type'] = DeliverableType::from($validated['type']);
        }
        if (isset($validated['status'])) {
            $newStatus = DeliverableStatus::from($validated['status']);
            if ($oldStatus !== $newStatus) {
                $statusChanged = true;
            }
            $updateData['status'] = $newStatus;
            if ($validated['status'] === 'delivered' && ! $deliverable->delivered_date) {
                $updateData['delivered_date'] = now();
            }
        }
        if (isset($validated['version'])) {
            $updateData['version'] = $validated['version'];
        }
        if (array_key_exists('fileUrl', $validated)) {
            $updateData['file_url'] = $validated['fileUrl'];
        }
        if (isset($validated['acceptanceCriteria'])) {
            $updateData['acceptance_criteria'] = $validated['acceptanceCriteria'];
        }

        $deliverable->update($updateData);

        if ($statusChanged) {
            $this->dispatchStatusChangeNotification(
                $deliverable,
                $oldStatus,
                $updateData['status'],
                $request->user()
            );
        }

        return back();
    }

    public function destroy(Request $request, Deliverable $deliverable): RedirectResponse
    {
        $this->authorize('delete', $deliverable);

        $workOrderId = $deliverable->work_order_id;
        $deliverableTitle = $deliverable->title;

        StatusTransition::create([
            'transitionable_type' => WorkOrder::class,
            'transitionable_id' => $workOrderId,
            'user_id' => $request->user()->id,
            'action_type' => 'status_change',
            'comment' => "Deliverable \"{$deliverableTitle}\" deleted",
            'created_at' => now(),
        ]);

        $deliverable->delete();

        return redirect()->route('work-orders.show', $workOrderId);
    }

    public function uploadFile(Request $request, Deliverable $deliverable): RedirectResponse
    {
        $this->authorize('update', $deliverable);

        $validated = $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
        ]);

        $user = $request->user();
        $file = $validated['file'];
        $fileName = $file->getClientOriginalName();
        $fileSize = $file->getSize();

        $path = $file->store("deliverables/{$deliverable->id}", 'public');
        $fileUrl = Storage::disk('public')->url($path);

        $documentType = DocumentType::Artifact;

        Document::create([
            'team_id' => $deliverable->team_id,
            'uploaded_by_id' => $user->id,
            'documentable_type' => Deliverable::class,
            'documentable_id' => $deliverable->id,
            'name' => $fileName,
            'type' => $documentType,
            'file_url' => $fileUrl,
            'file_size' => $this->fileUploadService->formatFileSize($fileSize),
        ]);

        return back();
    }

    public function deleteFile(Request $request, Deliverable $deliverable, Document $document): RedirectResponse
    {
        $this->authorize('update', $deliverable);

        if ($document->documentable_type !== Deliverable::class || $document->documentable_id !== $deliverable->id) {
            abort(403);
        }

        $path = str_replace(Storage::disk('public')->url(''), '', $document->file_url);
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }

        $document->delete();

        return back();
    }

    /**
     * Format version data for API response.
     *
     * @return array<string, mixed>
     */
    private function formatVersionData(DeliverableVersion $version): array
    {
        return [
            'id' => $version->id,
            'versionNumber' => $version->version_number,
            'fileUrl' => $version->file_url,
            'fileName' => $version->file_name,
            'fileSize' => $this->fileUploadService->formatFileSize($version->file_size),
            'fileSizeBytes' => $version->file_size,
            'mimeType' => $version->mime_type,
            'notes' => $version->notes,
            'uploadedBy' => $version->uploadedBy ? [
                'id' => (string) $version->uploadedBy->id,
                'name' => $version->uploadedBy->name,
            ] : null,
            'createdAt' => $version->created_at?->toISOString(),
            'updatedAt' => $version->updated_at?->toISOString(),
        ];
    }

    /**
     * Dispatch notification to work order owner and assignee when status changes.
     */
    private function dispatchStatusChangeNotification(
        Deliverable $deliverable,
        DeliverableStatus $oldStatus,
        DeliverableStatus $newStatus,
        User $changedBy
    ): void {
        $deliverable->load('workOrder.createdBy', 'workOrder.assignedTo');
        $workOrder = $deliverable->workOrder;

        if (! $workOrder) {
            return;
        }

        $recipients = collect();

        if ($workOrder->createdBy && $workOrder->createdBy->id !== $changedBy->id) {
            $recipients->push($workOrder->createdBy);
        }

        if ($workOrder->assignedTo && $workOrder->assignedTo->id !== $changedBy->id) {
            $recipients->push($workOrder->assignedTo);
        }

        if ($recipients->isEmpty()) {
            return;
        }

        Notification::send(
            $recipients->unique('id'),
            new DeliverableStatusChangedNotification(
                $deliverable,
                $oldStatus,
                $newStatus,
                $changedBy
            )
        );
    }
}
