<?php

declare(strict_types=1);

use App\Models\OAuthUser;
use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Testing\TestResponse;
use Laravel\Passport\Passport;

/**
 * OAuthUser::tokenCan() returns true unconditionally, so for MCP clients the
 * team role is the only thing standing between a `viewer` and a write.
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
});

function actAs(User $user): void
{
    Passport::actingAs(OAuthUser::findOrFail($user->id), ['mcp:use']);
}

function callWriteTool(string $name, array $arguments): TestResponse
{
    return test()->postJson('/mcp', [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'tools/call',
        'params' => ['name' => $name, 'arguments' => $arguments],
    ]);
}

test('a viewer can still read through MCP', function () {
    actAs($this->viewer);

    callWriteTool('list-projects-tool', [])
        ->assertOk()
        ->assertJsonMissingPath('error');
});

test('a viewer cannot create a project through MCP', function () {
    actAs($this->viewer);

    callWriteTool('create-project-tool', [
        'name' => 'Viewer Project',
        'party_id' => $this->party->id,
    ])->assertForbidden();

    $this->assertDatabaseMissing('projects', ['name' => 'Viewer Project']);
});

test('a viewer cannot create a work order, task or deliverable through MCP', function () {
    actAs($this->viewer);

    callWriteTool('create-work-order-tool', [
        'project_id' => $this->project->id,
        'title' => 'Viewer WO',
    ])->assertForbidden();

    callWriteTool('create-task-tool', [
        'work_order_id' => $this->workOrder->id,
        'title' => 'Viewer Task',
    ])->assertForbidden();

    callWriteTool('create-deliverable-tool', [
        'work_order_id' => $this->workOrder->id,
        'title' => 'Viewer Deliverable',
        'type' => 'document',
    ])->assertForbidden();

    $this->assertDatabaseMissing('work_orders', ['title' => 'Viewer WO']);
    $this->assertDatabaseMissing('tasks', ['title' => 'Viewer Task']);
    $this->assertDatabaseMissing('deliverables', ['title' => 'Viewer Deliverable']);
});

test('a viewer cannot update existing records through MCP', function () {
    actAs($this->viewer);

    callWriteTool('update-project-tool', [
        'id' => $this->project->id,
        'name' => 'renamed',
    ])->assertForbidden();

    callWriteTool('update-work-order-tool', [
        'id' => $this->workOrder->id,
        'title' => 'renamed',
    ])->assertForbidden();

    callWriteTool('update-task-tool', [
        'id' => $this->task->id,
        'title' => 'renamed',
    ])->assertForbidden();

    expect($this->project->fresh()->name)->not->toBe('renamed')
        ->and($this->task->fresh()->title)->not->toBe('renamed');
});

test('a member can still write through MCP', function () {
    actAs($this->member);

    $response = callWriteTool('create-project-tool', [
        'name' => 'Member Project',
        'party_id' => $this->party->id,
    ]);

    $response->assertOk()->assertJsonMissingPath('error');
    expect($response->json('result.isError'))->toBeFalse();

    $this->assertDatabaseHas('projects', ['name' => 'Member Project']);
});

test('the team owner can still write through MCP despite having no pivot row', function () {
    actAs($this->owner);

    $response = callWriteTool('create-project-tool', [
        'name' => 'Owner Project',
        'party_id' => $this->party->id,
    ]);

    $response->assertOk()->assertJsonMissingPath('error');
    expect($response->json('result.isError'))->toBeFalse();

    $this->assertDatabaseHas('projects', ['name' => 'Owner Project']);
});
