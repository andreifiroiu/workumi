<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Folder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DocumentsController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        $team = $request->user()->currentTeam;

        if (! $team) {
            return redirect()->route('account.teams.index');
        }

        // Get team-scoped folders (not project-specific)
        $folders = Folder::forTeam($team->id)
            ->whereNull('project_id')
            ->whereNull('parent_id')
            ->with(['children.children', 'creator'])
            ->withCount('documents')
            ->orderBy('name')
            ->get();

        // Get documents query
        $folderId = $request->query('folder_id');
        $documentsQuery = Document::where('team_id', $team->id)
            ->whereNull('documentable_type')
            ->with(['folder', 'uploadedBy'])
            ->orderBy('created_at', 'desc');

        if ($folderId) {
            $documentsQuery->where('folder_id', $folderId);
        } else {
            $documentsQuery->whereNull('folder_id');
        }

        $documents = $documentsQuery->get();

        return Inertia::render('documents/index', [
            'folders' => $this->formatFolders($folders),
            'documents' => $this->formatDocuments($documents),
            'selectedFolderId' => $folderId,
        ]);
    }

    /**
     * Format folders for frontend consumption.
     *
     * @param  Collection<int, Folder>  $folders
     * @return array<int, array<string, mixed>>
     */
    private function formatFolders($folders): array
    {
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
     * Format documents for frontend consumption.
     *
     * @param  Collection<int, Document>  $documents
     * @return array<int, array<string, mixed>>
     */
    private function formatDocuments($documents): array
    {
        return $documents->map(fn (Document $doc) => [
            'id' => (string) $doc->id,
            'name' => $doc->name,
            'type' => $doc->type->value,
            'fileUrl' => $doc->file_url,
            'fileSize' => $doc->file_size,
            'mimeType' => $doc->mime_type ?? $this->guessMimeType($doc->name),
            'folderId' => $doc->folder_id ? (string) $doc->folder_id : null,
            'uploadedBy' => $doc->uploadedBy?->name,
            'uploadedDate' => $doc->created_at->format('Y-m-d'),
        ])->toArray();
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
}
