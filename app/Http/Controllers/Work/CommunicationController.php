<?php

declare(strict_types=1);

namespace App\Http\Controllers\Work;

use App\Events\MessageCreated;
use App\Http\Controllers\Controller;
use App\Models\CommunicationThread;
use App\Models\Message;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use App\Notifications\MentionNotification;
use App\Services\MentionParserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\File;

class CommunicationController extends Controller
{
    private const BLOCKED_EXTENSIONS = [
        'exe', 'bat', 'cmd', 'com', 'msi', 'dll', 'scr',
        'vbs', 'vbe', 'js', 'jse', 'ws', 'wsf',
        'ps1', 'ps1xml', 'psc1', 'psd1', 'psm1',
        'sh', 'bash', 'zsh', 'csh', 'ksh',
        'app', 'dmg', 'deb', 'rpm', 'jar',
    ];

    private const MAX_FILE_SIZE_MB = 50;

    public function __construct(
        private readonly MentionParserService $mentionParser
    ) {}

    public function show(Request $request, string $type, int $id): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        $model = $this->getModel($type, $id);

        if ($model === null || $model->team_id !== $team->id) {
            abort(404);
        }

        $thread = $model->communicationThread;

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

    public function store(Request $request, string $type, int $id): RedirectResponse
    {
        $validated = $request->validate([
            'content' => 'required|string|max:10000',
            'type' => 'required|string|in:note,suggestion,decision,question,status_update,approval_request,message',
            'attachments' => 'sometimes|array|max:10',
            'attachments.*' => [
                'file',
                File::default()
                    ->max(self::MAX_FILE_SIZE_MB * 1024),
            ],
        ]);

        $user = $request->user();
        $team = $user->currentTeam;

        $model = $this->getModel($type, $id);

        if ($model === null || $model->team_id !== $team->id) {
            abort(404);
        }

        // Posting to a thread modifies the parent work item
        $this->authorize('update', $model);

        // Validate file extensions
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $extension = strtolower($file->getClientOriginalExtension());
                if (in_array($extension, self::BLOCKED_EXTENSIONS, true)) {
                    return back()->withErrors([
                        'attachments' => 'File type not allowed for security reasons.',
                    ]);
                }
            }
        }

        // Get or create thread
        $thread = $model->communicationThread;

        if ($thread === null) {
            $thread = CommunicationThread::create([
                'team_id' => $team->id,
                'threadable_type' => $model::class,
                'threadable_id' => $model->id,
            ]);
        }

        // Add message with mentions
        $message = $thread->addMessage(
            $user,
            $validated['content'],
            $validated['type'],
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

        // Handle file attachments
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('message-attachments', 'public');

                $message->attachments()->create([
                    'name' => $file->getClientOriginalName(),
                    'file_url' => $path,
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                ]);
            }
        }

        // Dispatch MessageCreated event for WebSocket readiness
        MessageCreated::dispatch($message, $thread);

        // Dispatch mention notifications for user mentions only
        $this->dispatchMentionNotifications($mentions, $message, $thread, $user);

        return back();
    }

    /**
     * Dispatch notifications to mentioned users.
     *
     * @param  array<int, array{type: string, class: class-string, id: int}>  $mentions
     */
    private function dispatchMentionNotifications(
        array $mentions,
        Message $message,
        CommunicationThread $thread,
        User $author
    ): void {
        foreach ($mentions as $mention) {
            // Only notify user mentions, not work item mentions
            if ($mention['class'] !== User::class) {
                continue;
            }

            $mentionedUser = User::find($mention['id']);

            // Skip if user not found or is the message author
            if ($mentionedUser === null || $mentionedUser->id === $author->id) {
                continue;
            }

            // Queue notification for async processing
            $mentionedUser->notify(new MentionNotification($message, $thread, $author));
        }
    }

    /**
     * Format a message for API response.
     *
     * @return array<string, mixed>
     */
    private function formatMessage(Message $msg, int $currentUserId): array
    {
        $canEditOrDelete = $msg->author_id === $currentUserId
            && $msg->created_at->diffInMinutes(now()) <= 10;

        // Group reactions by emoji with counts
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

    private function getModel(string $type, int $id): Project|WorkOrder|Task|null
    {
        return match ($type) {
            'projects' => Project::find($id),
            'work-orders' => WorkOrder::find($id),
            'tasks' => Task::find($id),
            default => null,
        };
    }
}
