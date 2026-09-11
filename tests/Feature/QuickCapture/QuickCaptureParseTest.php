<?php

use App\Models\Party;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkOrder;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->current_team_id = $this->team->id;
    $this->user->save();

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
    // Pinned: the factory randomises status across every case including
    // archived, which capture options and the parser both filter out.
    $this->project = Project::factory()->active()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);
    $this->workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);
});

/**
 * The team has no API key, so LLMService returns null and the heuristic path
 * runs. Capture has to stay usable without AI configured.
 */
test('parsing falls back to heuristics without an api key', function () {
    $response = $this->actingAs($this->user)->postJson('/capture/parse', [
        'text' => "Draft the Q3 report\nInclude last quarter's figures",
    ]);

    $response->assertStatus(200);

    expect($response->json('proposal.title'))->toBe('Draft the Q3 report');
    expect($response->json('proposal.description'))->toBe("Include last quarter's figures");
    expect($response->json('proposal.confidence'))->toBe('low');
    expect($response->json('proposal.type'))->toBe('task');
});

test('parsing creates nothing', function () {
    $this->actingAs($this->user)->postJson('/capture/parse', [
        'text' => 'Build the new onboarding flow',
    ])->assertStatus(200);

    $this->assertDatabaseMissing('tasks', ['title' => 'Build the new onboarding flow']);
    $this->assertDatabaseMissing('work_orders', ['title' => 'Build the new onboarding flow']);
    $this->assertDatabaseMissing('projects', ['name' => 'Build the new onboarding flow']);
    $this->assertDatabaseMissing('documents', ['name' => 'Build the new onboarding flow.md']);
});

test('an explicit note prefix is proposed as a note', function () {
    $response = $this->actingAs($this->user)->postJson('/capture/parse', [
        'text' => 'Note: the client prefers Tuesday calls',
    ]);

    expect($response->json('proposal.type'))->toBe('note');
});

/**
 * A task proposal the user could not submit is worse than none: without any
 * visible work order the form would refuse it on Create.
 */
test('a task is downgraded to a note when the team has no work orders', function () {
    $this->workOrder->forceDelete();

    $response = $this->actingAs($this->user)->postJson('/capture/parse', [
        'text' => 'Send the invoice',
    ]);

    expect($response->json('proposal.type'))->toBe('note');
});

test('parsing requires text', function () {
    $this->actingAs($this->user)->postJson('/capture/parse', ['text' => ''])
        ->assertStatus(422);
});

test('a viewer cannot parse', function () {
    $viewer = createTeamUser($this->team, 'viewer');

    $this->actingAs($viewer)->postJson('/capture/parse', ['text' => 'Something'])
        ->assertStatus(403);
});
