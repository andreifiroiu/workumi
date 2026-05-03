<?php

declare(strict_types=1);

namespace App\Mcp\Tools\Tasks;

use App\Mcp\TeamContext;
use App\Models\Task;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Get full details of a single task, including its checklist progress, work order, project, and assigned user.')]
class GetTaskTool extends Tool
{
    public function handle(Request $request, TeamContext $context): Response
    {
        $validated = $request->validate([
            'id' => ['required', 'integer'],
        ]);

        $task = Task::forTeam($context->teamId)
            ->with([
                'workOrder:id,title,project_id',
                'workOrder.project:id,name',
                'assignedTo:id,name',
                'reviewer:id,name',
            ])
            ->findOrFail($validated['id']);

        $data = $task->toArray();
        $data['checklist_progress'] = $task->checklist_progress;

        return Response::json($data);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->integer()->description('The task ID'),
        ];
    }
}
