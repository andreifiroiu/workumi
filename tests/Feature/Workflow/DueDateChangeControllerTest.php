<?php

declare(strict_types=1);

use App\Models\Party;
use App\Models\Project;
use App\Models\StatusTransition;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Database\Eloquent\Collection;

beforeEach(function () {
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
        'due_date' => '2026-06-01',
    ]);
});

function dueDateChanges(): Collection
{
    return StatusTransition::query()->where('action_type', 'due_date_change')->get();
}

/*
 * Task
 */

test('updating a task due date logs one due_date_change with reason', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'due_date' => '2026-06-01',
    ]);

    $this->actingAs($this->user)
        ->patch("/work/tasks/{$task->id}", [
            'dueDate' => '2026-06-15',
            'reason' => 'Client requested more time',
        ])
        ->assertRedirect();

    $changes = dueDateChanges();
    expect($changes)->toHaveCount(1);

    $change = $changes->first();
    expect($change->transitionable_type)->toBe(Task::class);
    expect($change->transitionable_id)->toBe($task->id);
    expect($change->user_id)->toBe($this->user->id);
    expect($change->from_due_date->toDateString())->toBe('2026-06-01');
    expect($change->to_due_date->toDateString())->toBe('2026-06-15');
    expect($change->comment)->toBe('Client requested more time');
});

test('updating a task without changing the due date logs nothing', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'due_date' => '2026-06-01',
    ]);

    $this->actingAs($this->user)
        ->patch("/work/tasks/{$task->id}", [
            'title' => 'Renamed task',
            'dueDate' => '2026-06-01',
        ])
        ->assertRedirect();

    expect(dueDateChanges())->toHaveCount(0);
});

test('clearing a task due date logs a date to null change with null comment', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'due_date' => '2026-06-01',
    ]);

    $this->actingAs($this->user)
        ->patchJson("/work/tasks/{$task->id}", [
            'dueDate' => null,
        ])
        ->assertRedirect();

    $changes = dueDateChanges();
    expect($changes)->toHaveCount(1);
    expect($changes->first()->from_due_date->toDateString())->toBe('2026-06-01');
    expect($changes->first()->to_due_date)->toBeNull();
    expect($changes->first()->comment)->toBeNull();
});

test('setting an initial task due date logs a null to date change', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'due_date' => null,
    ]);

    $this->actingAs($this->user)
        ->patch("/work/tasks/{$task->id}", [
            'dueDate' => '2026-07-01',
        ])
        ->assertRedirect();

    $changes = dueDateChanges();
    expect($changes)->toHaveCount(1);
    expect($changes->first()->from_due_date)->toBeNull();
    expect($changes->first()->to_due_date->toDateString())->toBe('2026-07-01');
    expect($changes->first()->comment)->toBeNull();
});

/*
 * WorkOrder
 */

test('updating a work order due date logs one due_date_change with reason', function () {
    $this->actingAs($this->user)
        ->patch("/work/work-orders/{$this->workOrder->id}", [
            'due_date' => '2026-06-20',
            'reason' => 'Scope expanded',
        ])
        ->assertRedirect();

    $changes = dueDateChanges();
    expect($changes)->toHaveCount(1);

    $change = $changes->first();
    expect($change->transitionable_type)->toBe(WorkOrder::class);
    expect($change->transitionable_id)->toBe($this->workOrder->id);
    expect($change->user_id)->toBe($this->user->id);
    expect($change->from_due_date->toDateString())->toBe('2026-06-01');
    expect($change->to_due_date->toDateString())->toBe('2026-06-20');
    expect($change->comment)->toBe('Scope expanded');
});

test('updating a work order without changing the due date logs nothing', function () {
    $this->actingAs($this->user)
        ->patch("/work/work-orders/{$this->workOrder->id}", [
            'title' => 'Renamed work order',
            'due_date' => '2026-06-01',
        ])
        ->assertRedirect();

    expect(dueDateChanges())->toHaveCount(0);
});

test('clearing a work order due date logs a date to null change with null comment', function () {
    $this->actingAs($this->user)
        ->patchJson("/work/work-orders/{$this->workOrder->id}", [
            'due_date' => null,
        ])
        ->assertRedirect();

    $changes = dueDateChanges();
    expect($changes)->toHaveCount(1);
    expect($changes->first()->from_due_date->toDateString())->toBe('2026-06-01');
    expect($changes->first()->to_due_date)->toBeNull();
    expect($changes->first()->comment)->toBeNull();
});

test('setting an initial work order due date logs a null to date change', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'accountable_id' => $this->user->id,
        'due_date' => null,
    ]);

    $this->actingAs($this->user)
        ->patch("/work/work-orders/{$workOrder->id}", [
            'due_date' => '2026-08-01',
        ])
        ->assertRedirect();

    $changes = dueDateChanges();
    expect($changes)->toHaveCount(1);
    expect($changes->first()->from_due_date)->toBeNull();
    expect($changes->first()->to_due_date->toDateString())->toBe('2026-08-01');
    expect($changes->first()->comment)->toBeNull();
});
