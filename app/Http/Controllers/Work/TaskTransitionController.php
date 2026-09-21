<?php

declare(strict_types=1);

namespace App\Http\Controllers\Work;

use App\Enums\TaskStatus;
use App\Exceptions\InvalidTransitionException;
use App\Http\Controllers\Controller;
use App\Http\Requests\TransitionRequest;
use App\Models\Task;
use App\Services\WorkflowTransitionService;
use App\Support\TimeLogPrompt;
use Illuminate\Http\JsonResponse;

class TaskTransitionController extends Controller
{
    public function __construct(
        private readonly WorkflowTransitionService $transitionService,
    ) {}

    /**
     * Transition a task to a new status.
     */
    public function transition(TransitionRequest $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task);

        $toStatus = TaskStatus::from($request->validated('status'));
        $comment = $request->validated('comment');

        try {
            $this->transitionService->transition(
                item: $task,
                actor: $request->user(),
                toStatus: $toStatus,
                comment: $comment,
            );
        } catch (InvalidTransitionException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'reason' => $e->reason,
                'from_status' => $e->fromStatus,
                'to_status' => $e->toStatus,
            ], 422);
        }

        // Reload task with transitions
        $task->refresh();
        $task->load(['statusTransitions' => function ($query) {
            $query->orderBy('created_at', 'desc');
        }]);

        return response()->json([
            'message' => 'Task status updated successfully.',
            'timeLogPrompt' => $toStatus === TaskStatus::Done ? TimeLogPrompt::forTask($task) : null,
            'task' => [
                'id' => (string) $task->id,
                'title' => $task->title,
                'status' => $task->status->value,
                'statusLabel' => $task->status->label(),
                'statusColor' => $task->status->color(),
                'statusTransitions' => $task->statusTransitions->map(fn ($transition) => [
                    'id' => (string) $transition->id,
                    'from_status' => $transition->from_status,
                    'to_status' => $transition->to_status,
                    'comment' => $transition->comment,
                    'created_at' => $transition->created_at->toIso8601String(),
                    'user_id' => $transition->user_id ? (string) $transition->user_id : null,
                ]),
            ],
        ]);
    }
}
