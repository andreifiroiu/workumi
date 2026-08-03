<?php

declare(strict_types=1);

namespace App\Http\Controllers\Documents;

use App\Http\Controllers\Controller;
use App\Models\Folder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class FolderController extends Controller
{
    /**
     * List folders with nested structure.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        $query = Folder::forTeam($team->id)
            ->with(['children.children', 'creator', 'documents'])
            ->withCount('documents');

        // Filter by project if provided
        if ($request->has('project_id')) {
            $query->forProject((int) $request->get('project_id'));
        } else {
            // Team-scoped folders only
            $query->teamScoped();
        }

        // Get root folders only
        $folders = $query->root()->orderBy('name')->get();

        return response()->json([
            'folders' => $folders->map(fn (Folder $folder) => $this->formatFolder($folder)),
        ]);
    }

    /**
     * Create a new folder.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'parent_id' => ['nullable', 'integer', 'exists:folders,id'],
        ]);

        $user = $request->user();
        $team = $user->currentTeam;

        // Verify parent folder belongs to the same team if provided
        if (isset($validated['parent_id'])) {
            $parentFolder = Folder::find($validated['parent_id']);

            $this->authorize('view', $parentFolder);

            // Enforce 3-level nesting limit
            if (! $parentFolder->canHaveChildren()) {
                if ($request->wantsJson() && ! $request->header('X-Inertia')) {
                    return response()->json([
                        'error' => 'Maximum folder nesting depth reached.',
                    ], 422);
                }

                return back()->withErrors([
                    'parent_id' => 'Maximum folder nesting depth reached.',
                ]);
            }

            // Ensure project_id matches parent's project_id
            $validated['project_id'] = $parentFolder->project_id;
        }

        $folder = new Folder([
            'team_id' => $team->id,
            'project_id' => $validated['project_id'] ?? null,
            'parent_id' => $validated['parent_id'] ?? null,
            'name' => $validated['name'],
            'created_by_id' => $user->id,
        ]);

        $this->authorize('create', $folder);

        $folder->save();

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            $folder->load(['creator', 'parent', 'children']);

            return response()->json([
                'folder' => $this->formatFolder($folder),
            ], 201);
        }

        return back();
    }

    /**
     * Get a single folder's details.
     */
    public function show(Request $request, Folder $folder): JsonResponse
    {
        $this->authorize('view', $folder);

        $folder->load([
            'children.children',
            'creator',
            'documents.uploadedBy',
            'parent',
        ]);
        $folder->loadCount('documents');

        return response()->json([
            'folder' => $this->formatFolder($folder, true),
        ]);
    }

    /**
     * Update a folder.
     */
    public function update(Request $request, Folder $folder): JsonResponse|RedirectResponse
    {
        $this->authorize('update', $folder);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'parent_id' => ['sometimes', 'nullable', 'integer', 'exists:folders,id'],
        ]);

        // Handle parent folder change
        if (isset($validated['parent_id'])) {
            if ($validated['parent_id'] === $folder->id) {
                if ($request->wantsJson() && ! $request->header('X-Inertia')) {
                    return response()->json([
                        'error' => 'A folder cannot be its own parent.',
                    ], 422);
                }

                return back()->withErrors([
                    'parent_id' => 'A folder cannot be its own parent.',
                ]);
            }

            if ($validated['parent_id'] !== null) {
                $newParent = Folder::find($validated['parent_id']);
                $this->authorize('view', $newParent);

                // Prevent circular references
                if ($this->wouldCreateCircularReference($folder, $newParent)) {
                    if ($request->wantsJson() && ! $request->header('X-Inertia')) {
                        return response()->json([
                            'error' => 'This move would create a circular reference.',
                        ], 422);
                    }

                    return back()->withErrors([
                        'parent_id' => 'This move would create a circular reference.',
                    ]);
                }

                // Enforce 3-level nesting limit for the deepest child
                $currentDepth = $this->getSubtreeDepth($folder);
                $newParentDepth = $newParent->depth();

                if ($newParentDepth + $currentDepth > Folder::MAX_DEPTH) {
                    if ($request->wantsJson() && ! $request->header('X-Inertia')) {
                        return response()->json([
                            'error' => 'This move would exceed the maximum folder nesting depth.',
                        ], 422);
                    }

                    return back()->withErrors([
                        'parent_id' => 'This move would exceed the maximum folder nesting depth.',
                    ]);
                }
            }
        }

        $folder->update($validated);

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            $folder->load(['creator', 'parent', 'children']);

            return response()->json([
                'folder' => $this->formatFolder($folder),
            ]);
        }

        return back();
    }

    /**
     * Delete a folder.
     */
    public function destroy(Request $request, Folder $folder): JsonResponse|RedirectResponse
    {
        $this->authorize('delete', $folder);

        // Delete all child folders and move documents to root
        $this->recursiveDeleteFolder($folder);

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json(null, 204);
        }

        return back();
    }

    /**
     * Format a folder for API response.
     *
     * @return array<string, mixed>
     */
    private function formatFolder(Folder $folder, bool $includeDocuments = false): array
    {
        $data = [
            'id' => (string) $folder->id,
            'name' => $folder->name,
            'projectId' => $folder->project_id ? (string) $folder->project_id : null,
            'parentId' => $folder->parent_id ? (string) $folder->parent_id : null,
            'depth' => $folder->depth(),
            'canHaveChildren' => $folder->canHaveChildren(),
            'documentsCount' => $folder->documents_count ?? $folder->documents->count(),
            'createdAt' => $folder->created_at->toIso8601String(),
            'updatedAt' => $folder->updated_at->toIso8601String(),
            'creator' => $folder->creator ? [
                'id' => (string) $folder->creator->id,
                'name' => $folder->creator->name,
            ] : null,
            'children' => $folder->relationLoaded('children')
                ? $folder->children->map(fn (Folder $child) => $this->formatFolder($child))
                : [],
        ];

        if ($includeDocuments && $folder->relationLoaded('documents')) {
            $data['documents'] = $folder->documents->map(fn ($doc) => [
                'id' => (string) $doc->id,
                'name' => $doc->name,
                'type' => $doc->type->value,
                'fileSize' => $doc->file_size,
                'uploadedBy' => $doc->uploadedBy ? [
                    'id' => (string) $doc->uploadedBy->id,
                    'name' => $doc->uploadedBy->name,
                ] : null,
                'createdAt' => $doc->created_at->toIso8601String(),
            ]);
        }

        return $data;
    }

    /**
     * Check if moving a folder would create a circular reference.
     */
    private function wouldCreateCircularReference(Folder $folder, Folder $newParent): bool
    {
        $ancestors = $newParent->ancestors();

        return $ancestors->contains('id', $folder->id);
    }

    /**
     * Get the depth of the deepest descendant in a folder's subtree.
     */
    private function getSubtreeDepth(Folder $folder): int
    {
        $maxDepth = 1;
        $children = $folder->children;

        foreach ($children as $child) {
            $childDepth = 1 + $this->getSubtreeDepth($child);
            $maxDepth = max($maxDepth, $childDepth);
        }

        return $maxDepth;
    }

    /**
     * Recursively delete a folder and its children.
     */
    private function recursiveDeleteFolder(Folder $folder): void
    {
        // Move documents to no folder (root level)
        $folder->documents()->update(['folder_id' => null]);

        // Recursively delete children
        foreach ($folder->children as $child) {
            $this->recursiveDeleteFolder($child);
        }

        $folder->delete();
    }
}
