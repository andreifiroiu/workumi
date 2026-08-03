<?php

declare(strict_types=1);

use App\Models\Deliverable;
use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;

/**
 * A token's write ability says the token may write; it says nothing about
 * whether its user may. A `viewer` holding a full-access token must still be
 * refused every write, exactly as in the web app.
 */
beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->team = $this->owner->createTeam(['name' => 'Alpha']);
    $this->owner->forceFill(['current_team_id' => $this->team->id])->save();

    $this->viewer = createTeamUser($this->team, 'viewer');
    $this->member = createTeamUser($this->team, 'member');

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
    $this->project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'status' => 'active',
    ]);
    $this->workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);
    $this->task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
    ]);
    $this->deliverable = Deliverable::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
    ]);

    $this->viewerToken = $this->viewer->createToken('viewer', ['*'])->plainTextToken;
    $this->memberToken = $this->member->createToken('member', ['*'])->plainTextToken;
});

test('a viewer can still read through the API', function () {
    $this->withToken($this->viewerToken)->getJson('/api/v1/projects')->assertOk();
    $this->withToken($this->viewerToken)->getJson('/api/v1/tasks')->assertOk();
});

test('a viewer with a full-access token cannot create a project', function () {
    $this->withToken($this->viewerToken)
        ->postJson('/api/v1/projects', [
            'name' => 'Viewer Project',
            'party_id' => $this->party->id,
        ])
        ->assertForbidden();

    $this->assertDatabaseMissing('projects', ['name' => 'Viewer Project']);
});

test('a viewer cannot create a work order, task or deliverable', function () {
    $this->withToken($this->viewerToken)
        ->postJson('/api/v1/work-orders', [
            'project_id' => $this->project->id,
            'title' => 'Viewer WO',
        ])
        ->assertForbidden();

    $this->withToken($this->viewerToken)
        ->postJson('/api/v1/tasks', [
            'work_order_id' => $this->workOrder->id,
            'title' => 'Viewer Task',
        ])
        ->assertForbidden();

    $this->withToken($this->viewerToken)
        ->postJson('/api/v1/deliverables', [
            'work_order_id' => $this->workOrder->id,
            'title' => 'Viewer Deliverable',
            'type' => 'document',
        ])
        ->assertForbidden();

    $this->assertDatabaseMissing('work_orders', ['title' => 'Viewer WO']);
    $this->assertDatabaseMissing('tasks', ['title' => 'Viewer Task']);
    $this->assertDatabaseMissing('deliverables', ['title' => 'Viewer Deliverable']);
});

test('a viewer cannot update existing records', function () {
    $this->withToken($this->viewerToken)
        ->patchJson("/api/v1/projects/{$this->project->id}", ['name' => 'renamed'])
        ->assertForbidden();

    $this->withToken($this->viewerToken)
        ->patchJson("/api/v1/work-orders/{$this->workOrder->id}", ['title' => 'renamed'])
        ->assertForbidden();

    $this->withToken($this->viewerToken)
        ->patchJson("/api/v1/tasks/{$this->task->id}", ['title' => 'renamed'])
        ->assertForbidden();

    $this->withToken($this->viewerToken)
        ->patchJson("/api/v1/deliverables/{$this->deliverable->id}", ['title' => 'renamed'])
        ->assertForbidden();

    expect($this->project->fresh()->name)->not->toBe('renamed')
        ->and($this->task->fresh()->title)->not->toBe('renamed');
});

test('a member is still allowed to write', function () {
    $this->withToken($this->memberToken)
        ->postJson('/api/v1/projects', [
            'name' => 'Member Project',
            'party_id' => $this->party->id,
        ])
        ->assertCreated();

    $this->withToken($this->memberToken)
        ->patchJson("/api/v1/tasks/{$this->task->id}", ['title' => 'member renamed'])
        ->assertOk();

    $this->assertDatabaseHas('projects', ['name' => 'Member Project']);
    expect($this->task->fresh()->title)->toBe('member renamed');
});

test('the team owner is still allowed to write', function () {
    $ownerToken = $this->owner->createToken('owner', ['*'])->plainTextToken;

    $this->withToken($ownerToken)
        ->postJson('/api/v1/projects', [
            'name' => 'Owner Project',
            'party_id' => $this->party->id,
        ])
        ->assertCreated();
});

test('validation still reports an unreachable parent as 422, not 403', function () {
    $strangerTeam = User::factory()->create()->createTeam(['name' => 'Charlie']);
    $foreignProject = Project::factory()->create(['team_id' => $strangerTeam->id, 'status' => 'active']);

    // The member may write, so this must fail on the invalid parent rather than
    // on the role check, which runs only after validation passes.
    $this->withToken($this->memberToken)
        ->postJson('/api/v1/work-orders', [
            'project_id' => $foreignProject->id,
            'title' => 'Nope',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['project_id']);
});
