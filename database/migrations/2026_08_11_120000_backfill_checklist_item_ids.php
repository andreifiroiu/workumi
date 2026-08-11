<?php

declare(strict_types=1);

use App\Models\Task;
use App\Support\ChecklistItems;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Log;

/**
 * Give existing checklist items the `id` the toggle, edit and delete endpoints
 * all match on.
 *
 * The API and MCP surfaces used to store items without one, and every one of
 * those endpoints looks items up by id — so those rows 500 on toggle. Task now
 * normalizes on write, but that only reaches a row when something happens to
 * write that column, which would migrate the table in random order over months
 * and silently re-key rows as a side effect of unrelated edits. Doing it here
 * makes it finite and observable instead.
 */
return new class extends Migration
{
    public function up(): void
    {
        $repaired = 0;

        Task::withTrashed()
            ->whereNotNull('checklist_items')
            ->chunkById(200, function ($tasks) use (&$repaired): void {
                foreach ($tasks as $task) {
                    $current = $task->getRawOriginal('checklist_items');
                    $normalized = ChecklistItems::normalize($task->checklist_items);

                    if (json_encode($normalized) === $current) {
                        continue;
                    }

                    // Quietly, and without touching timestamps: this is a repair,
                    // not an edit anyone made.
                    $task->timestamps = false;
                    $task->checklist_items = $normalized;
                    $task->saveQuietly();

                    $repaired++;
                }
            });

        Log::info('Backfilled checklist item ids', ['tasks_repaired' => $repaired]);
    }

    public function down(): void
    {
        // Irreversible by design: the ids that were missing cannot be un-assigned
        // without breaking the endpoints that now depend on them.
    }
};
