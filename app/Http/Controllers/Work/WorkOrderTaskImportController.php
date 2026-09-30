<?php

declare(strict_types=1);

namespace App\Http\Controllers\Work;

use App\Enums\TaskStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\ImportWorkOrderTasksRequest;
use App\Models\Task;
use App\Models\WorkOrder;
use App\Support\TaskMarkdown;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WorkOrderTaskImportController extends Controller
{
    private const int MAX_TASKS = 500;

    /**
     * The tasks.description column is a MySQL TEXT column.
     */
    private const int MAX_DESCRIPTION_BYTES = 65535;

    /**
     * Create a task on the work order for every item in an uploaded Markdown or
     * text file. Imported tasks always start as To Do and unassigned.
     *
     * The counts are flashed so the page can confirm what happened, including
     * lines the parser could not place, rather than leaving the user to spot
     * missing content in the task list.
     */
    public function __invoke(ImportWorkOrderTasksRequest $request, WorkOrder $workOrder): RedirectResponse
    {
        $content = $request->file('file')->get();

        if ($content === false) {
            throw ValidationException::withMessages(['file' => 'The uploaded file could not be read. Please try again.']);
        }

        if (! mb_check_encoding($content, 'UTF-8')) {
            throw ValidationException::withMessages(['file' => 'The file must be UTF-8 encoded text.']);
        }

        ['tasks' => $parsedTasks, 'skipped' => $skippedLines] = TaskMarkdown::parse($content);

        if ($parsedTasks === []) {
            throw ValidationException::withMessages(['file' => 'No tasks were found in that file.']);
        }

        if (count($parsedTasks) > self::MAX_TASKS) {
            throw ValidationException::withMessages(['file' => 'A file may hold at most '.self::MAX_TASKS.' tasks.']);
        }

        foreach ($parsedTasks as $parsedTask) {
            if (strlen((string) $parsedTask['description']) > self::MAX_DESCRIPTION_BYTES) {
                throw ValidationException::withMessages([
                    'file' => "The description of \"{$parsedTask['title']}\" is longer than 64 KB.",
                ]);
            }
        }

        DB::transaction(function () use ($request, $workOrder, $parsedTasks): void {
            $position = (int) $workOrder->tasks()->max('position_in_work_order');

            foreach ($parsedTasks as $parsedTask) {
                Task::create([
                    'team_id' => $workOrder->team_id,
                    'work_order_id' => $workOrder->id,
                    'project_id' => $workOrder->project_id,
                    'created_by_id' => $request->user()->id,
                    'title' => $parsedTask['title'],
                    'description' => $parsedTask['description'],
                    'status' => TaskStatus::Todo,
                    'due_date' => $parsedTask['dueDate'],
                    'estimated_hours' => 0,
                    'checklist_items' => $parsedTask['checklistItems'],
                    'position_in_work_order' => ++$position,
                ]);
            }
        });

        return back()->with('taskImport', [
            'imported' => count($parsedTasks),
            'skipped' => $skippedLines,
        ]);
    }
}
