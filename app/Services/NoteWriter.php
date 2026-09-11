<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\DocumentType;
use App\Models\Document;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Persists markdown notes as documents.
 *
 * A note is a Document with type `note` whose body lives on the public disk as a
 * `.md` file rather than in a column. The parent is optional: an unparented note
 * belongs to the team and surfaces in the Documents section.
 */
class NoteWriter
{
    public function __construct(
        private readonly FileUploadService $fileUploadService,
    ) {}

    /**
     * @param  Model|null  $parent  The entity the note hangs off, or null for a team-level note.
     */
    public function create(
        int $teamId,
        User $author,
        string $name,
        string $content,
        ?Model $parent = null,
        ?int $folderId = null,
    ): Document {
        return DB::transaction(function () use ($teamId, $author, $name, $content, $parent, $folderId): Document {
            $document = new Document([
                'team_id' => $teamId,
                'uploaded_by_id' => $author->id,
                'documentable_type' => $parent !== null ? $parent::class : null,
                'documentable_id' => $parent?->getKey(),
                'folder_id' => $folderId,
                'name' => $this->normalizeName($name),
                'type' => DocumentType::Note,
                'file_url' => '',
                'file_size' => $this->fileUploadService->formatFileSize(strlen($content)),
            ]);
            $document->save();

            $this->writeBody($document, $content);

            return $document;
        });
    }

    /**
     * Replace the name and body of an existing note.
     */
    public function update(Document $document, string $name, string $content): Document
    {
        $this->writeBody($document, $content, updateUrl: false);

        $document->update([
            'name' => $this->normalizeName($name),
            'file_size' => $this->fileUploadService->formatFileSize(strlen($content)),
        ]);

        return $document;
    }

    /**
     * Read a note's markdown body back off disk, or an empty string when the file is gone.
     */
    public function content(Document $document): string
    {
        $path = $this->pathFromUrl($document->file_url);

        if ($path !== '' && Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->get($path);
        }

        // A note that has a file_url but no file has lost its body. Rendering it
        // as empty is the only option left, but it is not a normal state and an
        // operator needs to know the file went missing.
        if ($path !== '') {
            Log::error('Note body is missing from storage', [
                'document_id' => $document->id,
                'team_id' => $document->team_id,
                'path' => $path,
            ]);
        }

        return '';
    }

    /**
     * The public disk is configured with `throw => false`, so a failed write
     * returns false instead of raising. Left unchecked that loses the note body
     * while the row, its size and the redirect all still report success, so the
     * result is checked and turned into a real failure.
     *
     * @throws RuntimeException when the body could not be stored
     */
    private function writeBody(Document $document, string $content, bool $updateUrl = true): void
    {
        $path = $this->storagePath($document);

        if (Storage::disk('public')->put($path, $content) === false) {
            Log::error('Note body could not be written', [
                'document_id' => $document->id,
                'team_id' => $document->team_id,
                'path' => $path,
                'bytes' => strlen($content),
            ]);

            throw new RuntimeException("Could not write the note body to {$path}.");
        }

        if ($updateUrl) {
            $document->update(['file_url' => Storage::disk('public')->url($path)]);
        }
    }

    /**
     * Notes are addressed by their parent so existing files keep their location.
     */
    private function storagePath(Document $document): string
    {
        $prefix = match ($document->documentable_type) {
            WorkOrder::class => "work-orders/{$document->documentable_id}/notes",
            Project::class => "projects/{$document->documentable_id}/notes",
            Task::class => "tasks/{$document->documentable_id}/notes",
            default => 'notes',
        };

        return "{$prefix}/note-{$document->id}.md";
    }

    private function pathFromUrl(string $url): string
    {
        return str_replace(Storage::disk('public')->url(''), '', $url);
    }

    private function normalizeName(string $name): string
    {
        $name = trim($name);

        return str_ends_with(strtolower($name), '.md') ? $name : $name.'.md';
    }
}
