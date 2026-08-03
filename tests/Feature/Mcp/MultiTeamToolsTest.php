<?php

declare(strict_types=1);

use App\Models\Party;
use App\Models\Project;
use App\Models\User;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    $this->user = User::factory()->create();

    // Team A is owned; team B is joined as a member. Both must be reachable.
    $this->teamA = $this->user->createTeam(['name' => 'Alpha']);

    $colleague = User::factory()->create();
    $this->teamB = $colleague->createTeam(['name' => 'Bravo']);
    $this->teamB->addUser($this->user, 'member');

    // A team the user has nothing to do with.
    $stranger = User::factory()->create();
    $this->teamC = $stranger->createTeam(['name' => 'Charlie']);

    $this->user->forceFill(['current_team_id' => $this->teamA->id])->save();

    // The factory randomizes status; pin it so notArchived() cannot drop rows.
    $this->projectA = Project::factory()->create(['team_id' => $this->teamA->id, 'name' => 'Alpha Project', 'status' => 'active']);
    $this->projectB = Project::factory()->create(['team_id' => $this->teamB->id, 'name' => 'Bravo Project', 'status' => 'active']);
    $this->projectC = Project::factory()->create(['team_id' => $this->teamC->id, 'name' => 'Charlie Project', 'status' => 'active']);

    // projects.party_id is NOT NULL, so creates must name a party in the same team.
    $this->partyB = Party::factory()->create(['team_id' => $this->teamB->id]);

    $this->token = $this->user->createToken('test')->plainTextToken;
});

function callTool(string $name, array $arguments = [], ?string $token = null): TestResponse
{
    return test()->withToken($token ?? test()->token)->postJson('/mcp', [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'tools/call',
        'params' => ['name' => $name, 'arguments' => $arguments],
    ]);
}

/**
 * A successful tool result arrives as JSON encoded into a text content block.
 */
function toolResult(TestResponse $response): array
{
    $response->assertOk()->assertJsonMissingPath('error');

    expect($response->json('result.isError'))->toBeFalse();

    return json_decode($response->json('result.content.0.text'), true, 512, JSON_THROW_ON_ERROR);
}

test('list projects spans every team the token can reach', function () {
    $result = toolResult(callTool('list-projects-tool'));

    $names = array_column($result['data'], 'name');

    expect($names)->toContain('Alpha Project')
        ->and($names)->toContain('Bravo Project')
        ->and($names)->not->toContain('Charlie Project')
        ->and(array_column($result['data'], 'team_id'))
        ->toEqualCanonicalizing([$this->teamA->id, $this->teamB->id]);
});

test('list projects narrows to one team when team_id is given', function () {
    $result = toolResult(callTool('list-projects-tool', ['team_id' => $this->teamB->id]));

    expect(array_column($result['data'], 'name'))->toBe(['Bravo Project']);
});

test('list projects rejects a team the token cannot reach', function () {
    callTool('list-projects-tool', ['team_id' => $this->teamC->id])
        ->assertForbidden();
});

test('get project reaches a team that is not the current team', function () {
    $result = toolResult(callTool('get-project-tool', ['id' => $this->projectB->id]));

    expect($result['id'])->toBe($this->projectB->id)
        ->and($result['team_id'])->toBe($this->teamB->id);
});

test('get project cannot see a project in an unreachable team', function () {
    callTool('get-project-tool', ['id' => $this->projectC->id])
        ->assertNotFound();
});

test('update project reaches a team that is not the current team', function () {
    toolResult(callTool('update-project-tool', [
        'id' => $this->projectB->id,
        'name' => 'Bravo Renamed',
    ]));

    expect($this->projectB->fresh()->name)->toBe('Bravo Renamed');
});

test('create project requires team_id when several teams are reachable', function () {
    $response = callTool('create-project-tool', ['name' => 'Ambiguous']);

    // Surfaces as a tool error, like any other rejected field.
    $response->assertOk();

    expect($response->json('result.isError'))->toBeTrue()
        ->and($response->json('result.content.0.text'))
        ->toContain($this->teamA->id.' (Alpha)', $this->teamB->id.' (Bravo)')
        ->and(Project::where('name', 'Ambiguous')->exists())->toBeFalse();
});

test('create project uses the team_id it is given', function () {
    $result = toolResult(callTool('create-project-tool', [
        'team_id' => $this->teamB->id,
        'name' => 'Explicit Team Project',
        'party_id' => $this->partyB->id,
    ]));

    expect($result['team_id'])->toBe($this->teamB->id);
});

test('create project rejects a party belonging to another team', function () {
    $partyA = Party::factory()->create(['team_id' => $this->teamA->id]);

    $response = callTool('create-project-tool', [
        'team_id' => $this->teamB->id,
        'name' => 'Cross Team Party',
        'party_id' => $partyA->id,
    ]);

    expect($response->json('result.isError'))->toBeTrue()
        ->and(Project::where('name', 'Cross Team Party')->exists())->toBeFalse();
});

test('create project falls back to the only team of a single-team user', function () {
    $solo = User::factory()->create();
    $soloTeam = $solo->createTeam(['name' => 'Solo']);
    $solo->forceFill(['current_team_id' => $soloTeam->id])->save();
    $soloParty = Party::factory()->create(['team_id' => $soloTeam->id]);

    $result = toolResult(callTool(
        'create-project-tool',
        ['name' => 'Implicit Team Project', 'party_id' => $soloParty->id],
        $solo->createToken('solo')->plainTextToken,
    ));

    expect($result['team_id'])->toBe($soloTeam->id);
});

test('create work order inherits the team from its project', function () {
    $result = toolResult(callTool('create-work-order-tool', [
        'project_id' => $this->projectB->id,
        'title' => 'Inherited Team',
    ]));

    expect($result['team_id'])->toBe($this->teamB->id);
});

test('create work order refuses a project in an unreachable team', function () {
    callTool('create-work-order-tool', [
        'project_id' => $this->projectC->id,
        'title' => 'Should Not Exist',
    ])->assertNotFound();
});

test('list teams returns every reachable team with the default flagged', function () {
    $result = toolResult(callTool('list-teams-tool'));

    $teams = collect($result['data']);

    expect($teams->pluck('name')->all())->toEqualCanonicalizing(['Alpha', 'Bravo'])
        ->and($teams->firstWhere('is_default', true)['id'])->toBe($this->teamA->id)
        ->and($teams->firstWhere('id', $this->teamA->id)['role'])->toBe('owner')
        ->and($teams->firstWhere('id', $this->teamB->id)['role'])->toBe('member');
});

test('get context reports the user and all reachable teams', function () {
    $result = toolResult(callTool('get-context-tool'));

    expect($result['user']['id'])->toBe($this->user->id)
        ->and($result['default_team_id'])->toBe($this->teamA->id)
        ->and(array_column($result['teams'], 'id'))
        ->toEqualCanonicalizing([$this->teamA->id, $this->teamB->id]);
});

test('list team members requires a team_id for a multi-team user', function () {
    expect(callTool('list-team-members-tool')->json('result.isError'))->toBeTrue();

    $explicit = toolResult(callTool('list-team-members-tool', ['team_id' => $this->teamB->id]));

    expect(array_column($explicit, 'id'))->toContain($this->user->id);
});

test('a restricted token only sees the teams it was pinned to', function () {
    $restricted = $this->user->createToken('restricted');
    $restricted->accessToken->forceFill(['team_ids' => [$this->teamB->id]])->save();

    $result = toolResult(callTool('list-projects-tool', [], $restricted->plainTextToken));

    expect(array_column($result['data'], 'name'))->toBe(['Bravo Project']);

    callTool('get-project-tool', ['id' => $this->projectA->id], $restricted->plainTextToken)
        ->assertNotFound();
});

test('a read-only token cannot write in any team', function () {
    $readOnly = $this->user->createToken('read-only', ['read'])->plainTextToken;

    callTool('create-project-tool', [
        'team_id' => $this->teamB->id,
        'name' => 'Should Not Exist',
    ], $readOnly)->assertForbidden();

    expect(Project::where('name', 'Should Not Exist')->exists())->toBeFalse();
});
