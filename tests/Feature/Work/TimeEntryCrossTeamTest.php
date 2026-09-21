<?php

declare(strict_types=1);

use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\User;
use App\Models\WorkOrder;

function taskOwnedBy(User $owner): Task
{
    $team = $owner->createTeam(['name' => 'Team '.fake()->unique()->word()]);
    $owner->current_team_id = $team->id;
    $owner->save();

    $party = Party::factory()->create(['team_id' => $team->id]);
    $project = Project::factory()->create([
        'team_id' => $team->id,
        'party_id' => $party->id,
        'owner_id' => $owner->id,
    ]);
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $team->id,
        'project_id' => $project->id,
        'created_by_id' => $owner->id,
        'accountable_id' => $owner->id,
    ]);

    return Task::factory()->create([
        'team_id' => $team->id,
        'project_id' => $project->id,
        'work_order_id' => $workOrder->id,
        'created_by_id' => $owner->id,
    ]);
}

test('a user cannot log time against a task in a team they do not belong to', function () {
    $stranger = User::factory()->create();
    $strangerTeam = $stranger->createTeam(['name' => 'Stranger Team']);
    $stranger->current_team_id = $strangerTeam->id;
    $stranger->save();

    $victimTask = taskOwnedBy(User::factory()->create());
    $hoursBefore = (float) $victimTask->actual_hours;

    $this->actingAs($stranger)
        ->post(route('time-entries.store'), [
            'taskId' => $victimTask->id,
            'hours' => 5,
            'date' => now()->toDateString(),
        ])
        ->assertForbidden();

    expect(TimeEntry::where('task_id', $victimTask->id)->exists())->toBeFalse();
    expect((float) $victimTask->fresh()->actual_hours)->toBe($hoursBefore);
});

test('logging time on a task in the current team still works and is filed under that team', function () {
    $user = User::factory()->create();
    $task = taskOwnedBy($user);

    $this->actingAs($user)
        ->post(route('time-entries.store'), [
            'taskId' => $task->id,
            'hours' => 2,
            'date' => now()->toDateString(),
        ])
        ->assertRedirect();

    $entry = TimeEntry::where('task_id', $task->id)->sole();

    expect($entry->team_id)->toBe($task->team_id)
        ->and((float) $entry->hours)->toBe(2.0)
        ->and((float) $task->fresh()->actual_hours)->toBe(2.0);
});
