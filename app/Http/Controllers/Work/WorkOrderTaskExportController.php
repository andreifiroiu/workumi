<?php

declare(strict_types=1);

namespace App\Http\Controllers\Work;

use App\Enums\TaskStatus;
use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\WorkOrder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WorkOrderTaskExportController extends Controller
{
    /**
     * Download the work order's non-archived tasks as a Markdown checklist.
     */
    public function __invoke(WorkOrder $workOrder): StreamedResponse
    {
        $this->authorize('view', $workOrder);

        $workOrder->load('project');

        $tasks = $workOrder->tasks()
            ->notArchived()
            ->ordered()
            ->with('assignedTo', 'assignedAgent')
            ->get();

        $markdown = $this->render($workOrder, $tasks);
        $filename = (Str::slug($workOrder->title) ?: 'work-order').'-tasks.md';

        return response()->streamDownload(
            function () use ($markdown): void {
                echo $markdown;
            },
            $filename,
            ['Content-Type' => 'text/markdown; charset=UTF-8'],
        );
    }

    /**
     * @param  Collection<int, Task>  $tasks
     */
    private function render(WorkOrder $workOrder, Collection $tasks): string
    {
        $lines = ['# '.$this->singleLine($workOrder->title), ''];

        if ($workOrder->project) {
            $lines[] = "**Project:** {$workOrder->project->name}";
            $lines[] = '';
        }

        $lines[] = "## Tasks ({$tasks->count()})";
        $lines[] = '';

        if ($tasks->isEmpty()) {
            $lines[] = '_No tasks._';
            $lines[] = '';
        }

        foreach ($tasks as $task) {
            array_push($lines, ...$this->renderTask($task));
        }

        return implode("\n", $lines);
    }

    /**
     * @return list<string>
     */
    private function renderTask(Task $task): array
    {
        $meta = array_filter([
            $task->status->label(),
            $task->assignedTo?->name ?? $task->assignedAgent?->name,
            $task->due_date ? 'Due '.$task->due_date->format('Y-m-d') : null,
        ]);

        $checkbox = $task->status === TaskStatus::Done ? 'x' : ' ';
        $lines = ["- [{$checkbox}] **{$this->singleLine($task->title)}** — ".implode(' · ', $meta), ''];

        $description = trim((string) $task->description);

        if ($description !== '') {
            foreach (preg_split('/\R/', $description) as $line) {
                $lines[] = $line === '' ? '' : "  {$line}";
            }
            $lines[] = '';
        }

        $checklist = $task->checklist_items ?? [];

        foreach ($checklist as $item) {
            $itemCheckbox = ($item['completed'] ?? false) ? 'x' : ' ';
            $lines[] = "  - [{$itemCheckbox}] {$this->singleLine((string) $item['text'])}";
        }

        if ($checklist !== []) {
            $lines[] = '';
        }

        return $lines;
    }

    /**
     * A line break inside a title or checklist item would end its list item
     * early and turn the rest into stray text, both on screen and on import.
     */
    private function singleLine(string $text): string
    {
        return trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
    }
}
