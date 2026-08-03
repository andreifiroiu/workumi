<?php

declare(strict_types=1);

namespace App\Http\Controllers\Documents;

use App\Http\Controllers\Controller;
use App\Models\CommunicationThread;
use App\Models\Document;
use App\Models\DocumentAnnotation;
use App\Models\Message;
use App\Services\MentionParserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DocumentAnnotationController extends Controller
{
    private const EDIT_WINDOW_MINUTES = 10;

    public function __construct(
        private readonly MentionParserService $mentionParser
    ) {}

    /**
     * List annotations for a document.
     */
    public function index(Request $request, Document $document): JsonResponse
    {
        $this->authorize('view', $document);

        $user = $request->user();

        $annotations = $document->annotations()
            ->with(['thread.messages.author', 'creator'])
            ->orderBy('page')
            ->orderBy('y_percent')
            ->orderBy('x_percent')
            ->get();

        return response()->json([
            'annotations' => $annotations->map(fn (DocumentAnnotation $annotation) => $this->formatAnnotation($annotation, $user->id)),
        ]);
    }

    /**
     * Create a new annotation with an initial comment.
     */
    public function store(Request $request, Document $document): JsonResponse|RedirectResponse
    {
        $this->authorize('update', $document);

        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'x_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'y_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'content' => ['required', 'string', 'max:10000'],
        ]);

        $user = $request->user();
        $team = $user->currentTeam;

        $annotation = DB::transaction(function () use ($validated, $user, $team, $document) {
            // Create the communication thread for this annotation
            $thread = CommunicationThread::create([
                'team_id' => $team->id,
                'threadable_type' => DocumentAnnotation::class,
                'threadable_id' => 0, // Will be updated after annotation creation
            ]);

            // Create the annotation
            $annotation = DocumentAnnotation::create([
                'document_id' => $document->id,
                'page' => $validated['page'],
                'x_percent' => $validated['x_percent'],
                'y_percent' => $validated['y_percent'],
                'communication_thread_id' => $thread->id,
                'created_by_id' => $user->id,
            ]);

            // Update thread to point to the annotation
            $thread->update([
                'threadable_id' => $annotation->id,
            ]);

            // Add the initial message to the thread
            $message = $thread->addMessage(
                $user,
                $validated['content'],
                'message',
                'human'
            );

            // Parse and store mentions
            $mentions = $this->mentionParser->parse($validated['content']);
            foreach ($mentions as $mention) {
                $message->mentions()->create([
                    'mentionable_type' => $mention['class'],
                    'mentionable_id' => $mention['id'],
                ]);
            }

            return $annotation;
        });

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            $annotation->load(['thread.messages.author', 'creator']);

            return response()->json([
                'annotation' => $this->formatAnnotation($annotation, $user->id),
            ], 201);
        }

        return back();
    }

    /**
     * Get a single annotation's details.
     */
    public function show(Request $request, Document $document, DocumentAnnotation $annotation): JsonResponse
    {
        $this->authorize('view', $document);
        $this->ensureAnnotationBelongsToDocument($document, $annotation);

        $user = $request->user();

        $annotation->load([
            'thread.messages' => function ($query) {
                $query->with(['author', 'mentions.mentionable', 'attachments', 'reactions'])
                    ->orderBy('created_at', 'asc');
            },
            'creator',
        ]);

        return response()->json([
            'annotation' => $this->formatAnnotation($annotation, $user->id, true),
        ]);
    }

    /**
     * Update an annotation's position.
     */
    public function update(Request $request, Document $document, DocumentAnnotation $annotation): JsonResponse|RedirectResponse
    {
        $this->authorize('update', $document);
        $this->ensureAnnotationBelongsToDocument($document, $annotation);

        $user = $request->user();

        // Only the creator can update the position
        if ($annotation->created_by_id !== $user->id) {
            if ($request->wantsJson() && ! $request->header('X-Inertia')) {
                return response()->json([
                    'error' => 'You can only update your own annotations.',
                ], 403);
            }

            return back()->withErrors([
                'position' => 'You can only update your own annotations.',
            ]);
        }

        $validated = $request->validate([
            'page' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'x_percent' => ['sometimes', 'required', 'numeric', 'min:0', 'max:100'],
            'y_percent' => ['sometimes', 'required', 'numeric', 'min:0', 'max:100'],
        ]);

        $annotation->update($validated);

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            $annotation->load(['thread.messages.author', 'creator']);

            return response()->json([
                'annotation' => $this->formatAnnotation($annotation, $user->id),
            ]);
        }

        return back();
    }

    /**
     * Delete an annotation and its thread.
     */
    public function destroy(Request $request, Document $document, DocumentAnnotation $annotation): JsonResponse|RedirectResponse
    {
        $this->authorize('update', $document);
        $this->ensureAnnotationBelongsToDocument($document, $annotation);

        $user = $request->user();

        // Only the creator can delete the annotation
        if ($annotation->created_by_id !== $user->id) {
            if ($request->wantsJson() && ! $request->header('X-Inertia')) {
                return response()->json([
                    'error' => 'You can only delete your own annotations.',
                ], 403);
            }

            return back()->withErrors([
                'annotation' => 'You can only delete your own annotations.',
            ]);
        }

        DB::transaction(function () use ($annotation) {
            // Delete the associated thread and its messages
            if ($annotation->thread !== null) {
                $annotation->thread->messages()->delete();
                $annotation->thread->delete();
            }

            $annotation->delete();
        });

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json(null, 204);
        }

        return back();
    }

    /**
     * Add a reply to an annotation's thread.
     */
    public function addReply(Request $request, Document $document, DocumentAnnotation $annotation): JsonResponse|RedirectResponse
    {
        $this->authorize('update', $document);
        $this->ensureAnnotationBelongsToDocument($document, $annotation);

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:10000'],
        ]);

        $user = $request->user();
        $thread = $annotation->thread;

        if ($thread === null) {
            abort(500, 'Annotation thread not found.');
        }

        $message = $thread->addMessage(
            $user,
            $validated['content'],
            'message',
            'human'
        );

        // Parse and store mentions
        $mentions = $this->mentionParser->parse($validated['content']);
        foreach ($mentions as $mention) {
            $message->mentions()->create([
                'mentionable_type' => $mention['class'],
                'mentionable_id' => $mention['id'],
            ]);
        }

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            $message->load(['author', 'mentions.mentionable', 'attachments', 'reactions']);

            return response()->json([
                'message' => $this->formatMessage($message, $user->id),
            ], 201);
        }

        return back();
    }

    /**
     * Format an annotation for API response.
     *
     * @return array<string, mixed>
     */
    private function formatAnnotation(DocumentAnnotation $annotation, int $currentUserId, bool $includeAllMessages = false): array
    {
        $data = [
            'id' => (string) $annotation->id,
            'documentId' => (string) $annotation->document_id,
            'page' => $annotation->page,
            'xPercent' => (float) $annotation->x_percent,
            'yPercent' => (float) $annotation->y_percent,
            'isForPdf' => $annotation->isForPdf(),
            'createdAt' => $annotation->created_at->toIso8601String(),
            'updatedAt' => $annotation->updated_at->toIso8601String(),
            'creator' => $annotation->creator ? [
                'id' => (string) $annotation->creator->id,
                'name' => $annotation->creator->name,
            ] : null,
            'canEdit' => $annotation->created_by_id === $currentUserId,
            'canDelete' => $annotation->created_by_id === $currentUserId,
        ];

        // Include thread info
        if ($annotation->thread !== null) {
            $data['thread'] = [
                'id' => (string) $annotation->thread->id,
                'messageCount' => $annotation->thread->message_count,
                'lastActivity' => $annotation->thread->last_activity?->toIso8601String(),
            ];

            // Include messages if requested
            if ($includeAllMessages && $annotation->thread->relationLoaded('messages')) {
                $data['messages'] = $annotation->thread->messages->map(
                    fn (Message $msg) => $this->formatMessage($msg, $currentUserId)
                );
            } else {
                // Include first message preview
                $firstMessage = $annotation->thread->messages->first();
                if ($firstMessage !== null) {
                    $data['preview'] = [
                        'content' => mb_strlen($firstMessage->content) > 100
                            ? mb_substr($firstMessage->content, 0, 100).'...'
                            : $firstMessage->content,
                        'authorName' => $firstMessage->author?->name ?? 'Unknown',
                    ];
                }
            }
        }

        return $data;
    }

    /**
     * Format a message for API response.
     *
     * @return array<string, mixed>
     */
    private function formatMessage(Message $msg, int $currentUserId): array
    {
        $canEditOrDelete = $msg->author_id === $currentUserId
            && $msg->created_at->diffInMinutes(now()) <= self::EDIT_WINDOW_MINUTES;

        $reactions = $msg->relationLoaded('reactions')
            ? $msg->reactions->groupBy('emoji')->map(function ($group, $emoji) use ($currentUserId) {
                return [
                    'emoji' => $emoji,
                    'count' => $group->count(),
                    'hasReacted' => $group->contains('user_id', $currentUserId),
                    'users' => $group->map(fn ($r) => ['id' => (string) $r->user_id])->values()->all(),
                ];
            })->values()->all()
            : [];

        return [
            'id' => (string) $msg->id,
            'authorId' => (string) $msg->author_id,
            'authorName' => $msg->author?->name ?? 'Unknown',
            'authorType' => $msg->author_type->value,
            'timestamp' => $msg->created_at->toIso8601String(),
            'content' => $msg->content,
            'type' => $msg->type->value,
            'editedAt' => $msg->edited_at?->toIso8601String(),
            'canEdit' => $canEditOrDelete,
            'canDelete' => $canEditOrDelete,
            'mentions' => $msg->relationLoaded('mentions')
                ? $msg->mentions->map(fn ($m) => [
                    'id' => (string) $m->id,
                    'type' => $m->mentionable_type,
                    'entityId' => (string) $m->mentionable_id,
                    'name' => $m->mentionable?->name ?? $m->mentionable?->title ?? 'Unknown',
                ])->all()
                : [],
            'attachments' => $msg->relationLoaded('attachments')
                ? $msg->attachments->map(fn ($a) => [
                    'id' => (string) $a->id,
                    'name' => $a->name,
                    'fileUrl' => Storage::disk('public')->url($a->file_url),
                    'fileSize' => $a->file_size,
                    'mimeType' => $a->mime_type,
                ])->all()
                : [],
            'reactions' => $reactions,
        ];
    }

    /**
     * Ensure the annotation belongs to the document.
     */
    private function ensureAnnotationBelongsToDocument(Document $document, DocumentAnnotation $annotation): void
    {
        if ($annotation->document_id !== $document->id) {
            abort(404, 'Annotation not found for this document.');
        }
    }
}
