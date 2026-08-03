<?php

declare(strict_types=1);

namespace App\Http\Controllers\Work;

use App\Enums\TimeTrackingMode;
use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Services\TimerTransitionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TimeEntryController extends Controller
{
    public function __construct(
        private readonly TimerTransitionService $timerTransitionService,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        $query = TimeEntry::query()
            ->forTeam($team->id)
            ->forUser($user->id)
            ->with(['task.workOrder.project'])
            ->orderByDesc('date')
            ->orderByDesc('created_at');

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->input('date_to'));
        }

        if ($request->filled('task_id')) {
            $query->where('task_id', $request->input('task_id'));
        }

        if ($request->has('billable') && $request->input('billable') !== '') {
            $isBillable = filter_var($request->input('billable'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($isBillable !== null) {
                $query->where('is_billable', $isBillable);
            }
        }

        $entries = $query->paginate(25)->withQueryString();

        return Inertia::render('work/time-entries/index', [
            'entries' => $entries,
            'filters' => [
                'date_from' => $request->input('date_from'),
                'date_to' => $request->input('date_to'),
                'task_id' => $request->input('task_id'),
                'billable' => $request->input('billable'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', TimeEntry::class);

        $validated = $request->validate([
            'taskId' => 'required|exists:tasks,id',
            'hours' => 'required|numeric|min:0.01|max:24',
            'date' => 'required|date',
            'note' => 'nullable|string|max:500',
            'is_billable' => 'boolean',
        ]);

        $user = $request->user();
        $team = $user->currentTeam;
        $task = Task::findOrFail($validated['taskId']);

        TimeEntry::create([
            'team_id' => $team->id,
            'user_id' => $user->id,
            'task_id' => $validated['taskId'],
            'hours' => $validated['hours'],
            'date' => $validated['date'],
            'mode' => TimeTrackingMode::Manual,
            'note' => $validated['note'] ?? null,
            'is_billable' => $validated['is_billable'] ?? true,
        ]);

        $task->recalculateActualHours();

        return back();
    }

    public function show(Request $request, TimeEntry $timeEntry): Response
    {
        $this->authorize('view', $timeEntry);

        $timeEntry->load(['task.workOrder.project']);

        return Inertia::render('work/time-entries/show', [
            'timeEntry' => $timeEntry,
        ]);
    }

    public function update(Request $request, TimeEntry $timeEntry): RedirectResponse
    {
        $this->authorize('update', $timeEntry);

        $validated = $request->validate([
            'hours' => 'required|numeric|min:0.01|max:24',
            'date' => 'required|date',
            'note' => 'nullable|string|max:500',
            'is_billable' => 'boolean',
        ]);

        $timeEntry->update([
            'hours' => $validated['hours'],
            'date' => $validated['date'],
            'note' => $validated['note'] ?? null,
            'is_billable' => $validated['is_billable'] ?? $timeEntry->is_billable,
        ]);

        $timeEntry->task->recalculateActualHours();

        return back();
    }

    public function destroy(Request $request, TimeEntry $timeEntry): RedirectResponse
    {
        $this->authorize('delete', $timeEntry);

        $task = $timeEntry->task;

        $timeEntry->delete();

        $task->recalculateActualHours();

        return back();
    }

    /**
     * Start a timer for the given task with confirmation flow.
     *
     * Returns JSON response with one of:
     * - confirmation_required: when task is Done/InReview/Approved
     * - blocked: when task is Cancelled
     * - started: when timer started successfully
     */
    public function startTimer(Request $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'is_billable' => 'boolean',
        ]);

        $user = $request->user();
        $isBillable = $validated['is_billable'] ?? true;
        $confirmed = filter_var($request->query('confirmed', 'false'), FILTER_VALIDATE_BOOLEAN);

        // If confirmed, use confirmAndStartTimer
        if ($confirmed) {
            return $this->handleConfirmedTimerStart($task, $user, $isBillable);
        }

        // Otherwise, check status and return appropriate response
        $result = $this->timerTransitionService->checkAndStartTimer($task, $user, $isBillable);

        return match ($result['status']) {
            'blocked' => $this->blockedResponse($result),
            'confirmation_required' => $this->confirmationRequiredResponse($result),
            'started' => $this->timerStartedResponse($result, $user),
            default => response()->json(['message' => 'Unknown status.'], 500),
        };
    }

    public function stopTimer(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);

        $user = $request->user();

        $activeTimer = TimeEntry::where('task_id', $task->id)
            ->where('user_id', $user->id)
            ->whereNotNull('started_at')
            ->whereNull('stopped_at')
            ->first();

        if (! $activeTimer) {
            return back()->withErrors(['timer' => 'No active timer found for this task.']);
        }

        $activeTimer->stopTimer();

        return back();
    }

    public function stopById(Request $request, TimeEntry $timeEntry): RedirectResponse
    {
        $this->authorize('update', $timeEntry);

        if ($timeEntry->stopped_at !== null) {
            return back()->withErrors(['timer' => 'This timer has already been stopped.']);
        }

        if ($timeEntry->started_at === null) {
            return back()->withErrors(['timer' => 'This entry is not a timer.']);
        }

        $timeEntry->stopTimer();

        return back();
    }

    /**
     * Handle confirmed timer start - stop existing timers and start new one.
     */
    private function handleConfirmedTimerStart(Task $task, mixed $user, bool $isBillable): JsonResponse
    {
        // Stop any existing running timers for this user
        $existingTimers = TimeEntry::where('user_id', $user->id)
            ->whereNotNull('started_at')
            ->whereNull('stopped_at')
            ->get();

        foreach ($existingTimers as $timer) {
            $timer->stopTimer();
        }

        try {
            $timeEntry = $this->timerTransitionService->confirmAndStartTimer($task, $user, $isBillable);

            return response()->json([
                'started' => true,
                'message' => 'Timer started successfully.',
                'time_entry' => [
                    'id' => (string) $timeEntry->id,
                    'task_id' => (string) $timeEntry->task_id,
                    'user_id' => (string) $timeEntry->user_id,
                    'started_at' => $timeEntry->started_at->toIso8601String(),
                    'is_billable' => $timeEntry->is_billable,
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'blocked' => true,
                'message' => $e->getMessage(),
                'current_status' => $task->status->value,
            ], 422);
        }
    }

    /**
     * Return blocked response when timer cannot be started.
     */
    private function blockedResponse(array $result): JsonResponse
    {
        return response()->json([
            'blocked' => true,
            'message' => $result['reason'],
            'current_status' => $result['current_status'],
        ], 422);
    }

    /**
     * Return confirmation required response for Done/InReview/Approved tasks.
     */
    private function confirmationRequiredResponse(array $result): JsonResponse
    {
        return response()->json([
            'confirmation_required' => true,
            'message' => $result['reason'],
            'current_status' => $result['current_status'],
        ]);
    }

    /**
     * Return timer started response with time entry data.
     */
    private function timerStartedResponse(array $result, mixed $user): JsonResponse
    {
        // Stop any existing running timers for this user first
        $existingTimers = TimeEntry::where('user_id', $user->id)
            ->whereNotNull('started_at')
            ->whereNull('stopped_at')
            ->where('id', '!=', $result['time_entry']->id)
            ->get();

        foreach ($existingTimers as $timer) {
            $timer->stopTimer();
        }

        $timeEntry = $result['time_entry'];

        return response()->json([
            'started' => true,
            'message' => 'Timer started successfully.',
            'time_entry' => [
                'id' => (string) $timeEntry->id,
                'task_id' => (string) $timeEntry->task_id,
                'user_id' => (string) $timeEntry->user_id,
                'started_at' => $timeEntry->started_at->toIso8601String(),
                'is_billable' => $timeEntry->is_billable,
            ],
        ]);
    }
}
