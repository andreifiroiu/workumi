<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ReviewEntityType;
use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Exceptions\InvalidTransitionException;
use App\Models\ReviewSnooze;
use App\Models\Team;
use App\Models\User;
use App\Services\Review\Contracts\ReviewFlow;
use App\Services\Review\ReviewFlowRegistry;
use App\Services\WorkflowTransitionService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class ReviewController extends Controller
{
    public function __construct(
        private ReviewFlowRegistry $registry,
        private WorkflowTransitionService $transitions,
    ) {}

    public function index(Request $request): Response
    {
        $team = $request->user()->currentTeam;

        return Inertia::render('review/index', [
            'flows' => $team ? $this->registry->summaries($team, $request->user()) : [],
        ]);
    }

    public function show(Request $request, string $flow): Response
    {
        $reviewFlow = $this->registry->findOrFail($flow);
        $user = $request->user();
        $team = $user->currentTeam;

        $items = $team
            ? $reviewFlow->query($team, $user)->get()->map(fn (Model $item) => $reviewFlow->mapItem($item))->all()
            : [];

        return Inertia::render('review/show', [
            'flow' => [
                'key' => $reviewFlow->type()->value,
                'title' => $reviewFlow->type()->label(),
                'description' => $reviewFlow->type()->description(),
                'icon' => $reviewFlow->type()->icon(),
                'entityType' => $reviewFlow->type()->entityType()->value,
                'actions' => array_map(fn ($action) => $action->toArray(), $reviewFlow->actions()),
            ],
            'items' => $items,
            'teamMembers' => $team ? $this->teamMembers($team) : [],
            'currentUserId' => (string) $user->id,
        ]);
    }

    public function apply(Request $request, string $flow): JsonResponse
    {
        $reviewFlow = $this->registry->findOrFail($flow);
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if($team === null, 403);

        $validated = $request->validate([
            'itemId' => ['required', 'integer'],
            'action' => ['required', 'string'],
        ]);

        $item = $this->resolveItem($reviewFlow, $team, (int) $validated['itemId']);

        $this->authorize('update', $item);

        return match ($validated['action']) {
            'set_due_date' => $this->applyDueDate($request, $item),
            'assign' => $this->applyAssignee($request, $team, $item),
            'snooze' => $this->applySnooze($request, $reviewFlow, $user, $team, $item),
            'complete' => $this->applyComplete($reviewFlow, $user, $item),
            default => response()->json(['message' => 'Unsupported action.'], 422),
        };
    }

    private function resolveItem(ReviewFlow $flow, Team $team, int $itemId): Model
    {
        $modelClass = $flow->type()->entityType()->modelClass();

        return $modelClass::query()
            ->where('team_id', $team->id)
            ->findOrFail($itemId);
    }

    private function applyDueDate(Request $request, Model $item): JsonResponse
    {
        $validated = $request->validate([
            'dueDate' => ['required', 'date'],
        ]);

        $item->update(['due_date' => Carbon::parse($validated['dueDate'])->toDateString()]);

        return response()->json(['ok' => true]);
    }

    private function applyAssignee(Request $request, Team $team, Model $item): JsonResponse
    {
        $validated = $request->validate([
            'userId' => ['required', 'integer', 'exists:users,id'],
        ]);

        abort_unless($this->isTeamMember($team, (int) $validated['userId']), 422, 'User is not a member of this team.');

        $item->update(['assigned_to_id' => (int) $validated['userId']]);

        return response()->json(['ok' => true]);
    }

    private function applySnooze(Request $request, ReviewFlow $flow, User $user, Team $team, Model $item): JsonResponse
    {
        $validated = $request->validate([
            'days' => ['required', 'integer', 'min:1', 'max:365'],
        ]);

        ReviewSnooze::updateOrCreate(
            [
                'user_id' => $user->id,
                'flow' => $flow->type()->value,
                'snoozable_type' => $item->getMorphClass(),
                'snoozable_id' => $item->getKey(),
            ],
            [
                'team_id' => $team->id,
                'snoozed_until' => now()->addDays((int) $validated['days']),
            ],
        );

        return response()->json(['ok' => true]);
    }

    /**
     * Mark the item complete by transitioning it to its terminal "done" status
     * (task → done, work order → delivered) through the workflow service, which
     * enforces the allowed-transition rules.
     */
    private function applyComplete(ReviewFlow $flow, User $user, Model $item): JsonResponse
    {
        $toStatus = $flow->type()->entityType() === ReviewEntityType::Task
            ? TaskStatus::Done
            : WorkOrderStatus::Delivered;

        try {
            $this->transitions->transition(
                item: $item,
                actor: $user,
                toStatus: $toStatus,
                comment: 'Marked complete from review',
            );
        } catch (InvalidTransitionException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json(['ok' => true]);
    }

    private function isTeamMember(Team $team, int $userId): bool
    {
        return $team->allUsers()->contains(fn (User $member) => $member->id === $userId);
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function teamMembers(Team $team): array
    {
        return $team->allUsers()
            ->map(fn (User $member) => [
                'id' => (string) $member->id,
                'name' => $member->name,
                'email' => $member->email,
            ])
            ->values()
            ->all();
    }
}
