<?php

use App\Models\Party;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->current_team_id = $this->team->id;
    $this->user->save();

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
});

test('user can view projects index', function () {
    Project::factory()->count(3)->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->get('/work');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page->component('work/index')
        ->has('projects', 3)
    );
});

test('user can create a project', function () {
    $response = $this->actingAs($this->user)->post('/work/projects', [
        'name' => 'Test Project',
        'partyId' => $this->party->id,
        'description' => 'A test project description',
        'startDate' => '2026-01-10',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('projects', [
        'name' => 'Test Project',
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);
});

test('user can view a project', function () {
    $project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->get("/work/projects/{$project->id}");

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page->component('work/projects/[id]')
        ->has('project')
        ->where('project.id', (string) $project->id)
    );
});

test('user can update a project', function () {
    $project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->patch("/work/projects/{$project->id}", [
        'name' => 'Updated Project Name',
        'status' => 'on_hold',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('projects', [
        'id' => $project->id,
        'name' => 'Updated Project Name',
        'status' => 'on_hold',
    ]);
});

test('user can archive a project', function () {
    $project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->user)->post("/work/projects/{$project->id}/archive");

    $response->assertRedirect();

    $this->assertDatabaseHas('projects', [
        'id' => $project->id,
        'status' => 'archived',
    ]);
});

test('user can restore an archived project', function () {
    $project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
        'status' => 'archived',
    ]);

    $response = $this->actingAs($this->user)->post("/work/projects/{$project->id}/restore");

    $response->assertRedirect();

    $this->assertDatabaseHas('projects', [
        'id' => $project->id,
        'status' => 'active',
    ]);
});

test('user can delete a project', function () {
    $project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->delete("/work/projects/{$project->id}");

    $response->assertRedirect('/work');

    $this->assertSoftDeleted('projects', [
        'id' => $project->id,
    ]);
});

test('user cannot view projects from another team', function () {
    $otherUser = User::factory()->create();
    $otherTeam = $otherUser->createTeam(['name' => 'Other Team']);
    $otherParty = Party::factory()->create(['team_id' => $otherTeam->id]);
    $otherProject = Project::factory()->create([
        'team_id' => $otherTeam->id,
        'party_id' => $otherParty->id,
        'owner_id' => $otherUser->id,
    ]);

    $response = $this->actingAs($this->user)->get("/work/projects/{$otherProject->id}");

    $response->assertStatus(403);
});

test('unauthenticated user cannot access work section', function () {
    $response = $this->get('/work');

    $response->assertRedirect('/login');
});

/**
 * A bare `exists:parties,id` let a project point at another team's client. The
 * API and MCP surfaces already scoped it; the web dialog was the outlier.
 */
test('creating a project rejects a party from another team', function () {
    $outsider = User::factory()->create();
    $otherTeam = $outsider->createTeam(['name' => 'Other Team']);
    $otherParty = Party::factory()->create(['team_id' => $otherTeam->id]);

    $this->actingAs($this->user)->post('/work/projects', [
        'name' => 'Cross Team Project',
        'partyId' => $otherParty->id,
        'startDate' => '2026-01-01',
    ])->assertSessionHasErrors('partyId');

    $this->assertDatabaseMissing('projects', ['name' => 'Cross Team Project']);
});

test('updating a project rejects a party from another team', function () {
    $outsider = User::factory()->create();
    $otherTeam = $outsider->createTeam(['name' => 'Other Team']);
    $otherParty = Party::factory()->create(['team_id' => $otherTeam->id]);

    $project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);

    $this->actingAs($this->user)->patch("/work/projects/{$project->id}", [
        'partyId' => $otherParty->id,
    ])->assertSessionHasErrors('partyId');

    expect($project->fresh()->party_id)->toBe($this->party->id);
});
