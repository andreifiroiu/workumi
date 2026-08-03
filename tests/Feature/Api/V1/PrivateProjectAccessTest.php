<?php

declare(strict_types=1);

use App\Models\Deliverable;
use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Private projects are limited to the people with a RACI role on them, exactly
 * as Project::scopeVisibleTo enforces for the web app. Work orders, tasks,
 * deliverables and parties carry no such rule in the app, so they must stay
 * team-scoped only here too.
 */
beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->team = $this->owner->createTeam(['name' => 'Alpha']);
    $this->owner->forceFill(['current_team_id' => $this->team->id])->save();

    // A colleague on the same team with no RACI role on the private project.
    $this->outsider = User::factory()->create();
    $this->team->addUser($this->outsider, 'member');
    $this->outsider->forceFill(['current_team_id' => $this->team->id])->save();

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);

    $this->private = Project::factory()->create([
        'team_id' => $this->team->id, 'name' => 'Secret Project', 'status' => 'active',
        'is_private' => true, 'owner_id' => $this->owner->id,
        'accountable_id' => $this->owner->id, 'responsible_id' => $this->owner->id,
        'consulted_ids' => [], 'informed_ids' => [],
    ]);

    $this->open = Project::factory()->create([
        'team_id' => $this->team->id, 'name' => 'Open Project', 'status' => 'active',
        'is_private' => false, 'owner_id' => $this->owner->id,
    ]);

    $this->ownerToken = $this->owner->createToken('owner')->plainTextToken;
    $this->outsiderToken = $this->outsider->createToken('outsider')->plainTextToken;
});

/**
 * A test shares one application container across its requests, and the auth
 * guard caches the first user it resolves — so swapping bearer tokens inside a
 * single test needs the guards forgotten first. A real request boots its own
 * container, so this is a test-harness concern only.
 */
function as_token(string $token): TestCase
{
    app('auth')->forgetGuards();

    return test()->withToken($token);
}

function callProjectTool(string $name, array $arguments, string $token): TestResponse
{
    return as_token($token)->postJson('/mcp', [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'tools/call',
        'params' => ['name' => $name, 'arguments' => $arguments],
    ]);
}

test('the model agrees the outsider cannot see it', function () {
    expect($this->private->isVisibleTo($this->outsider->id))->toBeFalse()
        ->and($this->private->isVisibleTo($this->owner->id))->toBeTrue();
});

test('REST: a private project is hidden from the listing', function () {
    $outsider = as_token($this->outsiderToken)->getJson('/api/v1/projects');
    expect(array_column($outsider->json('data'), 'name'))->toBe(['Open Project']);

    $owner = as_token($this->ownerToken)->getJson('/api/v1/projects');
    expect(array_column($owner->json('data'), 'name'))->toBe(['Open Project', 'Secret Project']);
});

test('REST: a private project cannot be read or written by an outsider', function () {
    as_token($this->outsiderToken)
        ->getJson('/api/v1/projects/'.$this->private->id)
        ->assertNotFound();

    as_token($this->outsiderToken)
        ->patchJson('/api/v1/projects/'.$this->private->id, ['name' => 'Hijacked'])
        ->assertNotFound();

    expect($this->private->fresh()->name)->toBe('Secret Project');

    // The people with a RACI role still have full access.
    as_token($this->ownerToken)
        ->getJson('/api/v1/projects/'.$this->private->id)
        ->assertOk();
});

test('REST: a work order cannot be created inside an invisible project', function () {
    as_token($this->outsiderToken)->postJson('/api/v1/work-orders', [
        'project_id' => $this->private->id,
        'title' => 'Should Not Exist',
    ])->assertStatus(422)->assertJsonValidationErrors('project_id');

    as_token($this->ownerToken)->postJson('/api/v1/work-orders', [
        'project_id' => $this->private->id,
        'title' => 'Allowed',
    ])->assertCreated();
});

test('MCP: a private project is hidden from list and get', function () {
    $list = callProjectTool('list-projects-tool', [], $this->outsiderToken);
    $names = array_column(json_decode($list->json('result.content.0.text'), true)['data'], 'name');
    expect($names)->toBe(['Open Project']);

    callProjectTool('get-project-tool', ['id' => $this->private->id], $this->outsiderToken)
        ->assertNotFound();

    callProjectTool('update-project-tool', ['id' => $this->private->id, 'name' => 'Hijacked'], $this->outsiderToken)
        ->assertNotFound();

    callProjectTool('create-work-order-tool', ['project_id' => $this->private->id, 'title' => 'Nope'], $this->outsiderToken)
        ->assertNotFound();

    expect($this->private->fresh()->name)->toBe('Secret Project');
});

test('MCP: someone with a RACI role on the private project still reaches it', function () {
    $consulted = User::factory()->create();
    $this->team->addUser($consulted, 'member');
    $this->private->forceFill(['consulted_ids' => [$consulted->id]])->save();

    $list = callProjectTool('list-projects-tool', [], $consulted->createToken('c')->plainTextToken);
    $names = array_column(json_decode($list->json('result.content.0.text'), true)['data'], 'name');

    expect($names)->toContain('Secret Project');
});

test('a work order in a private project is hidden from a teammate with no role', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id, 'project_id' => $this->private->id,
        'title' => 'Hidden Work Order', 'assigned_to_id' => $this->owner->id,
        'created_by_id' => $this->owner->id, 'accountable_id' => $this->owner->id,
        'consulted_ids' => [], 'informed_ids' => [],
    ]);

    // The project owner reaches it because they can see the project.
    as_token($this->ownerToken)->getJson('/api/v1/work-orders/'.$workOrder->id)->assertOk();

    as_token($this->outsiderToken)->getJson('/api/v1/work-orders/'.$workOrder->id)->assertNotFound();

    $list = as_token($this->outsiderToken)->getJson('/api/v1/work-orders');
    expect(array_column($list->json('data'), 'title'))->not->toContain('Hidden Work Order');
});

test('being assigned the work order grants access without any project role', function () {
    // This is what separates the chosen rule from a pure project cascade.
    $assignee = User::factory()->create();
    $this->team->addUser($assignee, 'member');

    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id, 'project_id' => $this->private->id,
        'title' => 'Assigned To Me', 'assigned_to_id' => $assignee->id,
        'created_by_id' => $this->owner->id, 'accountable_id' => $this->owner->id,
        'consulted_ids' => [], 'informed_ids' => [],
    ]);

    $other = WorkOrder::factory()->create([
        'team_id' => $this->team->id, 'project_id' => $this->private->id,
        'title' => 'Not Mine', 'assigned_to_id' => $this->owner->id,
        'created_by_id' => $this->owner->id, 'accountable_id' => $this->owner->id,
        'consulted_ids' => [], 'informed_ids' => [],
    ]);

    $token = $assignee->createToken('a')->plainTextToken;

    as_token($token)->getJson('/api/v1/work-orders/'.$workOrder->id)->assertOk();
    as_token($token)->getJson('/api/v1/work-orders/'.$other->id)->assertNotFound();

    // Still cannot see the project itself — access is to the work order only.
    as_token($token)->getJson('/api/v1/projects/'.$this->private->id)->assertNotFound();
});

test('tasks and deliverables follow their work order', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id, 'project_id' => $this->private->id,
        'title' => 'Hidden Work Order', 'assigned_to_id' => $this->owner->id,
        'created_by_id' => $this->owner->id, 'accountable_id' => $this->owner->id,
        'consulted_ids' => [], 'informed_ids' => [],
    ]);

    $task = Task::factory()->create([
        'team_id' => $this->team->id, 'work_order_id' => $workOrder->id,
        'project_id' => $this->private->id, 'title' => 'Hidden Task',
        'assigned_to_id' => $this->owner->id, 'status' => 'todo',
    ]);

    $deliverable = Deliverable::factory()->create([
        'team_id' => $this->team->id, 'work_order_id' => $workOrder->id,
        'project_id' => $this->private->id, 'title' => 'Hidden Deliverable',
    ]);

    as_token($this->outsiderToken)->getJson('/api/v1/tasks/'.$task->id)->assertNotFound();
    as_token($this->outsiderToken)->getJson('/api/v1/deliverables/'.$deliverable->id)->assertNotFound();

    as_token($this->ownerToken)->getJson('/api/v1/tasks/'.$task->id)->assertOk();
    as_token($this->ownerToken)->getJson('/api/v1/deliverables/'.$deliverable->id)->assertOk();
});

test('a task assignee sees their own task inside an otherwise hidden work order', function () {
    $assignee = User::factory()->create();
    $this->team->addUser($assignee, 'member');

    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id, 'project_id' => $this->private->id,
        'title' => 'Hidden Work Order', 'assigned_to_id' => $this->owner->id,
        'created_by_id' => $this->owner->id, 'accountable_id' => $this->owner->id,
        'consulted_ids' => [], 'informed_ids' => [],
    ]);

    $task = Task::factory()->create([
        'team_id' => $this->team->id, 'work_order_id' => $workOrder->id,
        'project_id' => $this->private->id, 'title' => 'My Task',
        'assigned_to_id' => $assignee->id, 'status' => 'todo',
    ]);

    $token = $assignee->createToken('t')->plainTextToken;

    as_token($token)->getJson('/api/v1/tasks/'.$task->id)->assertOk();
    as_token($token)->getJson('/api/v1/work-orders/'.$workOrder->id)->assertNotFound();
});

test('MCP applies the same work order and task rules', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id, 'project_id' => $this->private->id,
        'title' => 'Hidden Work Order', 'assigned_to_id' => $this->owner->id,
        'created_by_id' => $this->owner->id, 'accountable_id' => $this->owner->id,
        'consulted_ids' => [], 'informed_ids' => [],
    ]);

    callProjectTool('get-work-order-tool', ['id' => $workOrder->id], $this->outsiderToken)
        ->assertNotFound();

    callProjectTool('update-work-order-tool', ['id' => $workOrder->id, 'title' => 'Hijacked'], $this->outsiderToken)
        ->assertNotFound();

    callProjectTool('create-task-tool', ['work_order_id' => $workOrder->id, 'title' => 'Nope'], $this->outsiderToken)
        ->assertNotFound();

    $list = callProjectTool('list-work-orders-tool', [], $this->outsiderToken);
    $titles = array_column(json_decode($list->json('result.content.0.text'), true)['data'], 'title');
    expect($titles)->not->toContain('Hidden Work Order')
        ->and($workOrder->fresh()->title)->toBe('Hidden Work Order');
});

test('work orders in a non-private project remain visible to the whole team', function () {
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id, 'project_id' => $this->open->id,
        'title' => 'Open Work Order', 'assigned_to_id' => $this->owner->id,
        'created_by_id' => $this->owner->id, 'accountable_id' => $this->owner->id,
        'consulted_ids' => [], 'informed_ids' => [],
    ]);

    as_token($this->outsiderToken)->getJson('/api/v1/work-orders/'.$workOrder->id)->assertOk();
});
