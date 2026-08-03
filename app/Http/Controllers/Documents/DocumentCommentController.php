<?php

declare(strict_types=1);

namespace App\Http\Controllers\Documents;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Message;
use App\Services\MentionParserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentCommentController extends Controller
{
    private const EDIT_WINDOW_MINUTES = 10;

    public function __construct(
        private readonly MentionParserService $mentionParser
    ) {}

    /**
     * List comments for a document.
     */
    public function index(Request $request, Document $document): JsonResponse
    {
        $this->authorize('view', $document);

        $user = $request->user();
        $thread = $document->thread;

        if ($thread === null) {
            return response()->json([
                'thread' => null,
                'messages' => [],
            ]);
        }

        $messages = $thread->messages()
            ->with(['author', 'mentions.mentionable', 'attachments', 'reactions'])
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json([
            'thread' => [
                'id' => (string) $thread->id,
                'messageCount' => $thread->message_count,
                'lastActivity' => $thread->last_activity?->toIso8601String(),
            ],
            'messages' => $messages->map(fn (Message $msg) => $this->formatMessage($msg, $user->id)),
        ]);
    }

    /**
     * Add a comment to a document.
     */
    public function store(Request $request, Document $document): JsonResponse|RedirectResponse
    {
        $this->authorize('update', $document);

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:10000'],
            'type' => ['sometimes', 'string', 'in:note,suggestion,decision,question,message'],
        ]);

        $user = $request->user();
        $type = $validated['type'] ?? 'message';

        // Get or create thread for the document
        $thread = $document->getOrCreateThread();

        // Add message to the thread
        $message = $thread->addMessage(
            $user,
            $validated['content'],
            $type,
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
     * Update a comment.
     */
    public function update(Request $request, Document $document, Message $comment): JsonResponse|RedirectResponse
    {
        $this->authorize('update', $document);

        $user = $request->user();

        // Verify the comment belongs to the document's thread
        $thread = $document->thread;
        if ($thread === null || $comment->communication_thread_id !== $thread->id) {
            abort(404, 'Comment not found for this document.');
        }

        // Verify user owns the message
        if ($comment->author_id !== $user->id) {
            if ($request->wantsJson() && ! $request->header('X-Inertia')) {
                return response()->json([
                    'error' => 'You can only edit your own comments.',
                ], 403);
            }

            return back()->withErrors([
                'content' => 'You can only edit your own comments.',
            ]);
        }

        // Validate within 10-minute window
        if ($comment->created_at->diffInMinutes(now()) > self::EDIT_WINDOW_MINUTES) {
            if ($request->wantsJson() && ! $request->header('X-Inertia')) {
                return response()->json([
                    'error' => 'Comments can only be edited within 10 minutes of creation.',
                ], 422);
            }

            return back()->withErrors([
                'content' => 'Comments can only be edited within 10 minutes of creation.',
            ]);
        }

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:10000'],
        ]);

        // Update the message
        $comment->update([
            'content' => $validated['content'],
            'edited_at' => now(),
        ]);

        // Re-parse and update mentions
        $comment->mentions()->delete();
        $mentions = $this->mentionParser->parse($validated['content']);
        foreach ($mentions as $mention) {
            $comment->mentions()->create([
                'mentionable_type' => $mention['class'],
                'mentionable_id' => $mention['id'],
            ]);
        }

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            $comment->load(['author', 'mentions.mentionable', 'attachments', 'reactions']);

            return response()->json([
                'message' => $this->formatMessage($comment, $user->id),
            ]);
        }

        return back();
    }

    /**
     * Delete a comment.
     */
    public function destroy(Request $request, Document $document, Message $comment): JsonResponse|RedirectResponse
    {
        $this->authorize('update', $document);

        $user = $request->user();

        // Verify the comment belongs to the document's thread
        $thread = $document->thread;
        if ($thread === null || $comment->communication_thread_id !== $thread->id) {
            abort(404, 'Comment not found for this document.');
        }

        // Verify user owns the message
        if ($comment->author_id !== $user->id) {
            if ($request->wantsJson() && ! $request->header('X-Inertia')) {
                return response()->json([
                    'error' => 'You can only delete your own comments.',
                ], 403);
            }

            return back()->withErrors([
                'content' => 'You can only delete your own comments.',
            ]);
        }

        // Validate within 10-minute window
        if ($comment->created_at->diffInMinutes(now()) > self::EDIT_WINDOW_MINUTES) {
            if ($request->wantsJson() && ! $request->header('X-Inertia')) {
                return response()->json([
                    'error' => 'Comments can only be deleted within 10 minutes of creation.',
                ], 422);
            }

            return back()->withErrors([
                'content' => 'Comments can only be deleted within 10 minutes of creation.',
            ]);
        }

        $comment->delete();

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json(null, 204);
        }

        return back();
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

        $reactions = $msg->reactions->groupBy('emoji')->map(function ($group, $emoji) use ($currentUserId) {
            return [
                'emoji' => $emoji,
                'count' => $group->count(),
                'hasReacted' => $group->contains('user_id', $currentUserId),
                'users' => $group->map(fn ($r) => [
                    'id' => (string) $r->user_id,
                ])->values()->all(),
            ];
        })->values()->all();

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
            'mentions' => $msg->mentions->map(fn ($m) => [
                'id' => (string) $m->id,
                'type' => $m->mentionable_type,
                'entityId' => (string) $m->mentionable_id,
                'name' => $m->mentionable?->name ?? $m->mentionable?->title ?? 'Unknown',
            ])->all(),
            'attachments' => $msg->attachments->map(fn ($a) => [
                'id' => (string) $a->id,
                'name' => $a->name,
                'fileUrl' => Storage::disk('public')->url($a->file_url),
                'fileSize' => $a->file_size,
                'mimeType' => $a->mime_type,
            ])->all(),
            'reactions' => $reactions,
        ];
    }
}
