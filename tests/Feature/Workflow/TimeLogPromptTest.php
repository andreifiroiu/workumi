<?php

declare(strict_types=1);

use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\User;
use App\Models\WorkOrder;

beforeEach(function () {
    $this->withoutVite();

    $this->user = User::factory()->create();
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->current_team_id = $this->team->id;
    $this->user->save();

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
    $this->project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);
    $this->workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'accountable_id' => $this->user->id,
        'assigned_to_id' => $this->user->id,
        'status' => WorkOrderStatus::Active,
        'due_date' => now()->addWeek(),
    ]);
});

function promptMakeTask(array $attributes = []): Task
{
    return Task::factory()->create(array_merge([
        'team_id' => test()->team->id,
        'project_id' => test()->project->id,
        'work_order_id' => test()->workOrder->id,
        'created_by_id' => test()->user->id,
        'assigned_to_id' => test()->user->id,
        'status' => TaskStatus::InProgress,
        'estimated_hours' => 2.5,
    ], $attributes));
}

function promptLogTime(Task $task, array $attributes = []): TimeEntry
{
    return TimeEntry::factory()->create(array_merge([
        'team_id' => test()->team->id,
        'user_id' => test()->user->id,
        'task_id' => $task->id,
        'hours' => 1.5,
    ], $attributes));
}

test('closing a task with no logged time asks for an estimate', function () {
    $task = promptMakeTask(['title' => 'Write the report']);

    $this->actingAs($this->user)
        ->postJson(route('tasks.transition', $task), ['status' => 'done'])
        ->assertOk()
        ->assertJsonPath('timeLogPrompt.taskId', (string) $task->id)
        ->assertJsonPath('timeLogPrompt.taskTitle', 'Write the report')
        ->assertJsonPath('timeLogPrompt.estimatedHours', 2.5);
});

test('closing an unestimated task asks with a null estimate', function () {
    $task = promptMakeTask(['estimated_hours' => 0]);

    $this->actingAs($this->user)
        ->postJson(route('tasks.transition', $task), ['status' => 'done'])
        ->assertOk()
        ->assertJsonPath('timeLogPrompt.estimatedHours', null);
});

test('closing a task that already has logged time does not ask', function () {
    $task = promptMakeTask();
    promptLogTime($task);

    $this->actingAs($this->user)
        ->postJson(route('tasks.transition', $task), ['status' => 'done'])
        ->assertOk()
        ->assertJsonPath('timeLogPrompt', null);
});

test('a soft deleted time entry does not count as logged time', function () {
    $task = promptMakeTask();
    promptLogTime($task)->delete();

    $this->actingAs($this->user)
        ->postJson(route('tasks.transition', $task), ['status' => 'done'])
        ->assertOk()
        ->assertJsonPath('timeLogPrompt.taskId', (string) $task->id);
});

test('a running timer does not count as logged time', function () {
    $task = promptMakeTask();
    TimeEntry::startTimer($task, $this->user);

    $this->actingAs($this->user)
        ->postJson(route('tasks.transition', $task), ['status' => 'done'])
        ->assertOk()
        ->assertJsonPath('timeLogPrompt.taskId', (string) $task->id);
});

test('a timer stopped before it registered a minute does not count as logged time', function () {
    $task = promptMakeTask();
    promptLogTime($task, ['hours' => 0, 'mode' => 'timer']);

    $this->actingAs($this->user)
        ->postJson(route('tasks.transition', $task), ['status' => 'done'])
        ->assertOk()
        ->assertJsonPath('timeLogPrompt.taskId', (string) $task->id);
});

test('an estimate the log-time form would reject is not offered as a prefill', function () {
    $task = promptMakeTask(['estimated_hours' => 40]);

    $this->actingAs($this->user)
        ->postJson(route('tasks.transition', $task), ['status' => 'done'])
        ->assertOk()
        ->assertJsonPath('timeLogPrompt.estimatedHours', null);
});

test('transitions other than done never ask', function (string $from, string $to) {
    $task = promptMakeTask(['status' => TaskStatus::from($from)]);

    $this->actingAs($this->user)
        ->postJson(route('tasks.transition', $task), ['status' => $to])
        ->assertOk()
        ->assertJsonPath('timeLogPrompt', null);
})->with([
    ['todo', 'in_progress'],
    ['in_progress', 'in_review'],
    ['in_progress', 'blocked'],
    ['in_progress', 'cancelled'],
]);
