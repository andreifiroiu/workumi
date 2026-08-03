<?php

declare(strict_types=1);

use App\Models\Party;
use App\Models\Project;
use App\Models\User;
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

test('work orders in a private project stay team-scoped, matching the app', function () {
    // The app applies no visibility rule to work orders (WorkOrderPolicy is
    // team-only and WorkController fetches them with forTeam alone), so the API
    // must not invent one.
    $workOrder = as_token($this->ownerToken)->postJson('/api/v1/work-orders', [
        'project_id' => $this->private->id,
        'title' => 'Inside A Private Project',
    ])->json('data.id');

    as_token($this->outsiderToken)
        ->getJson('/api/v1/work-orders/'.$workOrder)
        ->assertOk();
});
