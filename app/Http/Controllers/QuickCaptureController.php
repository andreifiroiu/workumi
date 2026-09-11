<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\CaptureType;
use App\Http\Requests\StoreQuickCaptureRequest;
use App\Models\Party;
use App\Models\Project;
use App\Models\WorkOrder;
use App\Services\QuickCaptureParser;
use App\Services\QuickCaptureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Quick capture: create a project, work order, task or note from anywhere in the
 * app, either by filling in a short form or by letting the parser propose one
 * from free text.
 */
class QuickCaptureController extends Controller
{
    public function __construct(
        private readonly QuickCaptureService $capture,
        private readonly QuickCaptureParser $parser,
    ) {}

    /**
     * The selectable parents for the capture form. Fetched when the panel first
     * opens rather than shared on every page, since the launcher is global.
     */
    public function options(Request $request): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if ($team === null) {
            return response()->json(['parties' => [], 'projects' => [], 'workOrders' => []]);
        }

        $teamId = (int) $team->id;
        $userId = (int) $user->id;

        $projects = Project::query()
            ->forTeam($teamId)
            ->visibleTo($userId)
            ->notArchived()
            ->orderBy('name')
            ->get(['id', 'name']);

        $workOrders = WorkOrder::query()
            ->forTeam($teamId)
            ->visibleTo($userId)
            ->notArchived()
            ->orderBy('title')
            ->get(['id', 'title', 'project_id']);

        $parties = Party::query()
            ->forTeam($teamId)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json([
            'parties' => $parties->map(fn (Party $party) => [
                'id' => (string) $party->id,
                'name' => $party->name,
            ])->all(),
            'projects' => $projects->map(fn (Project $project) => [
                'id' => (string) $project->id,
                'name' => $project->name,
            ])->all(),
            'workOrders' => $workOrders->map(fn (WorkOrder $workOrder) => [
                'id' => (string) $workOrder->id,
                'title' => $workOrder->title,
                'projectId' => (string) $workOrder->project_id,
            ])->all(),
        ]);
    }

    /**
     * Propose a record from free text. Writes nothing — the user confirms the
     * proposal in the form before anything is created.
     */
    public function parse(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'text' => ['required', 'string', 'max:5000'],
        ]);

        $user = $request->user();
        $team = $user->currentTeam;

        if ($team === null) {
            abort(403);
        }

        if (! $user->canWriteTeamContent($team)) {
            abort(403);
        }

        $proposal = $this->parser->parse($validated['text'], $user, (int) $team->id);

        return response()->json(['proposal' => $proposal->toArray()]);
    }

    public function store(StoreQuickCaptureRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $user = $request->user();
        $teamId = $request->teamId();

        $record = match ($request->captureType()) {
            CaptureType::Project => $this->capture->createProject($validated, $user, $teamId),
            CaptureType::WorkOrder => $this->capture->createWorkOrder($validated, $user, $teamId, $request->project()),
            CaptureType::Task => $this->capture->createTask($validated, $user, $teamId, $request->workOrder()),
            CaptureType::Note => $this->capture->createNote($validated, $user, $teamId, $request->noteParent()),
            null => abort(422),
        };

        return back()->with('capture', [
            'type' => $request->captureType()->value,
            'id' => (string) $record->getKey(),
            'title' => $validated['title'],
            'url' => $this->urlFor($request->captureType(), (int) $record->getKey(), $request->noteParent()),
        ]);
    }

    /**
     * Where the captured record can be opened.
     *
     * A note has no route of its own. An unfiled one is listed by the Documents
     * section, but a filed one is not — that listing is `whereNull`
     * documentable — so a filed note links to the parent whose Documents tab
     * actually holds it.
     */
    private function urlFor(CaptureType $type, int $id, WorkOrder|Project|null $noteParent): ?string
    {
        return match ($type) {
            CaptureType::Project => route('projects.show', $id),
            CaptureType::WorkOrder => route('work-orders.show', $id),
            CaptureType::Task => route('tasks.show', $id),
            CaptureType::Note => match (true) {
                $noteParent instanceof WorkOrder => route('work-orders.show', $noteParent->id),
                $noteParent instanceof Project => route('projects.show', $noteParent->id),
                default => route('documents'),
            },
        };
    }
}
