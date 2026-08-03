<?php

declare(strict_types=1);

use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->team = $this->owner->createTeam(['name' => 'Alpha']);
    $this->owner->forceFill(['current_team_id' => $this->team->id])->save();

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);

    $this->private = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'name' => 'Secret Project',
        'status' => 'active',
        'is_private' => true,
        'owner_id' => $this->owner->id,
        'accountable_id' => $this->owner->id,
        'consulted_ids' => [],
        'informed_ids' => [],
    ]);

    // On the team, with no RACI role and no membership on the private project.
    $this->outsider = User::factory()->create();
    $this->team->addUser($this->outsider, 'member');
    $this->outsider->forceFill(['current_team_id' => $this->team->id])->save();

    $this->outsiderToken = $this->outsider->createToken('outsider')->plainTextToken;
});

test('an explicit project member reaches a private project over the API', function () {
    $this->withToken($this->outsiderToken)
        ->getJson('/api/v1/projects/'.$this->private->id)
        ->assertNotFound();

    $this->private->members()->attach($this->outsider, ['added_by_id' => $this->owner->id]);

    $this->withToken($this->outsiderToken)
        ->getJson('/api/v1/projects/'.$this->private->id)
        ->assertOk()
        ->assertJsonPath('data.name', 'Secret Project');
});

test('a private project is absent from the API listing without access', function () {
    $names = collect(
        $this->withToken($this->outsiderToken)->getJson('/api/v1/projects')->json('data')
    )->pluck('name')->all();

    expect($names)->not->toContain('Secret Project');
});

test('an explicit project member sees the project in the API listing', function () {
    $this->private->members()->attach($this->outsider, ['added_by_id' => $this->owner->id]);

    $names = collect(
        $this->withToken($this->outsiderToken)->getJson('/api/v1/projects')->json('data')
    )->pluck('name')->all();

    expect($names)->toContain('Secret Project');
});

test('an explicit project member reaches a private project over MCP', function () {
    $call = fn () => $this->withToken($this->outsiderToken)->postJson('/mcp', [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'tools/call',
        'params' => [
            'name' => 'get-project-tool',
            'arguments' => ['id' => $this->private->id],
        ],
    ]);

    expect($call()->json())->toBeArray();

    $this->private->members()->attach($this->outsider, ['added_by_id' => $this->owner->id]);
    app('auth')->forgetGuards();

    $body = json_encode($call()->json());

    expect($body)->toContain('Secret Project');
});

test('the API and the web agree about work orders inside a private project', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->private->id,
        'created_by_id' => $this->owner->id,
        'accountable_id' => $this->owner->id,
    ]);

    // The web denies it.
    $this->actingAs($this->outsider)
        ->get(route('work-orders.show', $workOrder))
        ->assertForbidden();

    app('auth')->forgetGuards();

    // The API must not be more permissive than the app it fronts.
    $this->withToken($this->outsiderToken)
        ->getJson('/api/v1/work-orders/'.$workOrder->id)
        ->assertNotFound();
});

test('the API and the web agree about tasks inside a private project', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->private->id,
        'created_by_id' => $this->owner->id,
        'accountable_id' => $this->owner->id,
    ]);

    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->private->id,
        'work_order_id' => $workOrder->id,
    ]);

    $this->actingAs($this->outsider)
        ->get(route('tasks.show', $task))
        ->assertForbidden();

    app('auth')->forgetGuards();

    $this->withToken($this->outsiderToken)
        ->getJson('/api/v1/tasks/'.$task->id)
        ->assertNotFound();
});
