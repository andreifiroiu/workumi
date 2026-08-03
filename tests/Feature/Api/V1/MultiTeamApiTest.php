<?php

declare(strict_types=1);

use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;

beforeEach(function () {
    $this->user = User::factory()->create();

    // Team A is owned; team B is joined as a member. Both must be reachable.
    $this->teamA = $this->user->createTeam(['name' => 'Alpha']);

    $colleague = User::factory()->create();
    $this->teamB = $colleague->createTeam(['name' => 'Bravo']);
    $this->teamB->addUser($this->user, 'member');

    $stranger = User::factory()->create();
    $this->teamC = $stranger->createTeam(['name' => 'Charlie']);

    $this->user->forceFill(['current_team_id' => $this->teamA->id])->save();

    // The factory randomizes status; pin it so notArchived() cannot drop rows.
    $this->projectA = Project::factory()->create(['team_id' => $this->teamA->id, 'name' => 'Alpha Project', 'status' => 'active']);
    $this->projectB = Project::factory()->create(['team_id' => $this->teamB->id, 'name' => 'Bravo Project', 'status' => 'active']);
    $this->projectC = Project::factory()->create(['team_id' => $this->teamC->id, 'name' => 'Charlie Project', 'status' => 'active']);

    $this->partyB = Party::factory()->create(['team_id' => $this->teamB->id]);

    $this->token = $this->user->createToken('test')->plainTextToken;
});

test('unauthenticated requests are rejected', function () {
    $this->getJson('/api/v1/projects')->assertUnauthorized();
});

test('teams lists every reachable team and flags the default', function () {
    $response = $this->withToken($this->token)->getJson('/api/v1/teams');

    $response->assertOk()
        ->assertJsonPath('meta.default_team_id', $this->teamA->id);

    expect(array_column($response->json('data'), 'name'))->toBe(['Alpha', 'Bravo'])
        ->and(collect($response->json('data'))->firstWhere('id', $this->teamA->id)['role'])->toBe('owner')
        ->and(collect($response->json('data'))->firstWhere('id', $this->teamB->id)['role'])->toBe('member');
});

test('teams excludes a team the user does not belong to', function () {
    $this->withToken($this->token)
        ->getJson('/api/v1/teams/'.$this->teamC->id)
        ->assertForbidden();
});

test('team members lists the owner and members', function () {
    $response = $this->withToken($this->token)
        ->getJson('/api/v1/teams/'.$this->teamB->id.'/members');

    $response->assertOk();

    expect(array_column($response->json('data'), 'id'))->toContain($this->user->id);
});

test('projects index spans every reachable team', function () {
    $response = $this->withToken($this->token)->getJson('/api/v1/projects');

    $response->assertOk();

    expect(array_column($response->json('data'), 'name'))
        ->toBe(['Alpha Project', 'Bravo Project'])
        ->and(array_column($response->json('data'), 'team_id'))
        ->toEqualCanonicalizing([$this->teamA->id, $this->teamB->id])
        ->and($response->json('data.1.team.name'))->toBe('Bravo');
});

test('projects index filters by team_id', function () {
    $response = $this->withToken($this->token)
        ->getJson('/api/v1/projects?team_id='.$this->teamB->id);

    $response->assertOk();

    expect(array_column($response->json('data'), 'name'))->toBe(['Bravo Project']);
});

test('projects index rejects an unreachable team_id', function () {
    $this->withToken($this->token)
        ->getJson('/api/v1/projects?team_id='.$this->teamC->id)
        ->assertForbidden();
});

test('a project in a non-current team can be read and updated', function () {
    $this->withToken($this->token)
        ->getJson('/api/v1/projects/'.$this->projectB->id)
        ->assertOk()
        ->assertJsonPath('data.team_id', $this->teamB->id);

    $this->withToken($this->token)
        ->patchJson('/api/v1/projects/'.$this->projectB->id, ['name' => 'Bravo Renamed'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Bravo Renamed');
});

test('a project in an unreachable team is not found', function () {
    $this->withToken($this->token)
        ->getJson('/api/v1/projects/'.$this->projectC->id)
        ->assertNotFound();

    $this->withToken($this->token)
        ->patchJson('/api/v1/projects/'.$this->projectC->id, ['name' => 'Nope'])
        ->assertNotFound();
});

test('creating a project requires team_id when several teams are reachable', function () {
    $response = $this->withToken($this->token)->postJson('/api/v1/projects', [
        'name' => 'Ambiguous',
        'party_id' => $this->partyB->id,
    ]);

    // Reported as a field error, consistent with every other 422 from the API.
    $response->assertStatus(422)->assertJsonValidationErrors('team_id');

    expect($response->json('errors.team_id.0'))
        ->toContain($this->teamA->id.' (Alpha)', $this->teamB->id.' (Bravo)')
        ->and(Project::where('name', 'Ambiguous')->exists())->toBeFalse();
});

test('API errors are JSON even without an Accept header', function () {
    // Without this, a failed validation redirects (302) and a missing record
    // renders HTML — neither is usable by an API client.
    $this->withToken($this->token)
        ->post('/api/v1/projects', ['team_id' => $this->teamB->id, 'name' => ''])
        ->assertStatus(422)
        ->assertJsonValidationErrors('name');

    $this->withToken($this->token)
        ->get('/api/v1/projects/999999')
        ->assertNotFound()
        ->assertJsonStructure(['message']);
});

test('columns the schema requires cannot be nulled out', function () {
    $this->withToken($this->token)
        ->patchJson('/api/v1/projects/'.$this->projectB->id, ['party_id' => null])
        ->assertStatus(422)
        ->assertJsonValidationErrors('party_id');

    $this->withToken($this->token)
        ->patchJson('/api/v1/projects/'.$this->projectB->id, ['start_date' => null])
        ->assertStatus(422)
        ->assertJsonValidationErrors('start_date');
});

test('the embedded team stamp stays small', function () {
    $response = $this->withToken($this->token)->getJson('/api/v1/projects');

    // App\Models\Team eager-loads roles.permissions and groups.permissions by
    // default; that must not ride along on every row of every collection.
    expect(array_keys($response->json('data.0.team')))->toBe(['id', 'name']);
});

test('creating a project with an explicit team_id succeeds', function () {
    $response = $this->withToken($this->token)->postJson('/api/v1/projects', [
        'team_id' => $this->teamB->id,
        'name' => 'Explicit Team Project',
        'party_id' => $this->partyB->id,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.team_id', $this->teamB->id)
        ->assertJsonPath('data.owner_id', $this->user->id);
});

test('creating a project rejects a party from another team', function () {
    $partyA = Party::factory()->create(['team_id' => $this->teamA->id]);

    $this->withToken($this->token)->postJson('/api/v1/projects', [
        'team_id' => $this->teamB->id,
        'name' => 'Cross Team Party',
        'party_id' => $partyA->id,
    ])->assertStatus(422)->assertJsonValidationErrors('party_id');
});

test('work orders and tasks inherit the team from their parent', function () {
    $workOrder = $this->withToken($this->token)->postJson('/api/v1/work-orders', [
        'project_id' => $this->projectB->id,
        'title' => 'Inherited Work Order',
    ])->assertCreated()->assertJsonPath('data.team_id', $this->teamB->id);

    $task = $this->withToken($this->token)->postJson('/api/v1/tasks', [
        'work_order_id' => $workOrder->json('data.id'),
        'title' => 'Inherited Task',
    ])->assertCreated()->assertJsonPath('data.team_id', $this->teamB->id);

    expect(Task::find($task->json('data.id'))->project_id)->toBe($this->projectB->id);
});

test('a work order in an unreachable team is refused', function () {
    $foreign = WorkOrder::factory()->create([
        'team_id' => $this->teamC->id,
        'project_id' => $this->projectC->id,
    ]);

    $this->withToken($this->token)
        ->getJson('/api/v1/work-orders/'.$foreign->id)
        ->assertNotFound();

    $this->withToken($this->token)->postJson('/api/v1/work-orders', [
        'project_id' => $this->projectC->id,
        'title' => 'Should Not Exist',
    ])->assertStatus(422)->assertJsonValidationErrors('project_id');
});

test('a restricted token only reaches the teams it was pinned to', function () {
    $restricted = $this->user->createToken('restricted');
    $restricted->accessToken->forceFill(['team_ids' => [$this->teamB->id]])->save();

    $response = $this->withToken($restricted->plainTextToken)->getJson('/api/v1/projects');

    $response->assertOk();

    expect(array_column($response->json('data'), 'name'))->toBe(['Bravo Project']);

    $this->withToken($restricted->plainTextToken)
        ->getJson('/api/v1/projects/'.$this->projectA->id)
        ->assertNotFound();

    $teams = $this->withToken($restricted->plainTextToken)->getJson('/api/v1/teams');

    expect(array_column($teams->json('data'), 'name'))->toBe(['Bravo']);
});

test('a read-only token can read but not write', function () {
    $readOnly = $this->user->createToken('read-only', ['read'])->plainTextToken;

    $this->withToken($readOnly)->getJson('/api/v1/projects')->assertOk();

    $this->withToken($readOnly)->postJson('/api/v1/projects', [
        'team_id' => $this->teamB->id,
        'name' => 'Should Not Exist',
        'party_id' => $this->partyB->id,
    ])->assertForbidden();

    expect(Project::where('name', 'Should Not Exist')->exists())->toBeFalse();
});

test('parties are listed across teams and filterable', function () {
    Party::factory()->create(['team_id' => $this->teamC->id]);

    $response = $this->withToken($this->token)->getJson('/api/v1/parties');

    $response->assertOk();

    $teamIds = array_unique(array_column($response->json('data'), 'team_id'));

    expect($teamIds)->not->toContain($this->teamC->id);
});
