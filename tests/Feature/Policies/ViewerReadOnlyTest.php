<?php

declare(strict_types=1);

use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\User;
use App\Models\WorkOrder;

beforeEach(function () {
    $this->owner = createTeamOwner();
    $this->team = $this->owner->currentTeam;

    $this->member = createTeamUser($this->team, 'member');
    $this->viewer = createTeamUser($this->team, 'viewer');

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
    $this->project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->owner->id,
    ]);
    $this->workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->owner->id,
    ]);
    $this->task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
    ]);
});

test('a viewer can read team content', function () {
    expect($this->viewer->can('view', $this->project))->toBeTrue()
        ->and($this->viewer->can('view', $this->workOrder))->toBeTrue()
        ->and($this->viewer->can('view', $this->task))->toBeTrue()
        ->and($this->viewer->can('view', $this->party))->toBeTrue();
});

test('a viewer cannot update or delete team content', function () {
    foreach ([$this->project, $this->workOrder, $this->task, $this->party] as $model) {
        expect($this->viewer->can('update', $model))->toBeFalse()
            ->and($this->viewer->can('delete', $model))->toBeFalse();
    }
});

test('a viewer cannot create team content', function () {
    expect($this->viewer->can('create', Project::class))->toBeFalse()
        ->and($this->viewer->can('create', WorkOrder::class))->toBeFalse()
        ->and($this->viewer->can('create', Task::class))->toBeFalse()
        ->and($this->viewer->can('create', Party::class))->toBeFalse();
});

test('a member retains full write access to team content', function () {
    foreach ([$this->project, $this->workOrder, $this->task, $this->party] as $model) {
        expect($this->member->can('view', $model))->toBeTrue()
            ->and($this->member->can('update', $model))->toBeTrue()
            ->and($this->member->can('delete', $model))->toBeTrue();
    }

    expect($this->member->can('create', Task::class))->toBeTrue();
});

test('the owner retains full write access despite having no pivot row', function () {
    expect($this->owner->teamRole($this->team)->code)->toBe('owner');

    foreach ([$this->project, $this->workOrder, $this->task, $this->party] as $model) {
        expect($this->owner->can('update', $model))->toBeTrue()
            ->and($this->owner->can('delete', $model))->toBeTrue();
    }

    expect($this->owner->can('create', Task::class))->toBeTrue();
});

test('a viewer is refused when posting a new task', function () {
    $this->actingAs($this->viewer)
        ->post('/work/tasks', [
            'title' => 'Viewer Task',
            'workOrderId' => $this->workOrder->id,
            'dueDate' => '2026-01-15',
        ])
        ->assertForbidden();

    $this->assertDatabaseMissing('tasks', ['title' => 'Viewer Task']);
});

test('a member can still post a new task', function () {
    $this->actingAs($this->member)
        ->post('/work/tasks', [
            'title' => 'Member Task',
            'workOrderId' => $this->workOrder->id,
            'dueDate' => '2026-01-15',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('tasks', [
        'title' => 'Member Task',
        'team_id' => $this->team->id,
    ]);
});

test('a viewer is refused when posting a new project', function () {
    $this->actingAs($this->viewer)
        ->post('/work/projects', [
            'name' => 'Viewer Project',
            'partyId' => $this->party->id,
            'startDate' => '2026-01-01',
            'targetEndDate' => '2026-02-01',
        ])
        ->assertForbidden();

    $this->assertDatabaseMissing('projects', ['name' => 'Viewer Project']);
});

test('a viewer cannot log time', function () {
    expect($this->viewer->can('create', TimeEntry::class))->toBeFalse()
        ->and($this->member->can('create', TimeEntry::class))->toBeTrue();
});

test('a user whose current team is set but who holds no role cannot write', function () {
    // Reads still resolve on current_team_id, but the role lookup fails closed.
    $ghost = User::factory()->create();
    $ghost->forceFill(['current_team_id' => $this->team->id])->save();

    expect($ghost->refresh()->can('view', $this->task))->toBeTrue()
        ->and($ghost->can('update', $this->task))->toBeFalse()
        ->and($ghost->can('delete', $this->task))->toBeFalse();
});
