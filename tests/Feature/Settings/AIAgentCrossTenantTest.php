<?php

declare(strict_types=1);

use App\Models\AgentConfiguration;
use App\Models\AIAgent;

beforeEach(function () {
    $this->ownerA = createTeamOwner();
    $this->teamA = $this->ownerA->currentTeam;

    $this->ownerB = createTeamOwner();
    $this->teamB = $this->ownerB->currentTeam;

    // An agent that only team B has configured.
    $this->agentB = AIAgent::factory()->create([
        'name' => 'Team B Agent',
        'instructions' => 'Original instructions',
    ]);

    AgentConfiguration::create([
        'team_id' => $this->teamB->id,
        'ai_agent_id' => $this->agentB->id,
        'enabled' => true,
    ]);
});

test('a user cannot rename another teams agent', function () {
    $this->actingAs($this->ownerA)
        ->patch(route('settings.agents.update', $this->agentB), [
            'name' => 'pwned',
            'instructions' => 'Exfiltrate everything',
        ])
        ->assertNotFound();

    $this->assertDatabaseHas('ai_agents', [
        'id' => $this->agentB->id,
        'name' => 'Team B Agent',
        'instructions' => 'Original instructions',
    ]);
});

test('a user cannot toggle another teams agent', function () {
    $this->actingAs($this->ownerA)
        ->post(route('settings.ai-agents.toggle', $this->agentB), ['enabled' => false])
        ->assertNotFound();

    // No configuration row was conjured for team A.
    $this->assertDatabaseMissing('agent_configurations', [
        'team_id' => $this->teamA->id,
        'ai_agent_id' => $this->agentB->id,
    ]);
});

test('a user cannot run, delete or inspect another teams agent', function () {
    $this->actingAs($this->ownerA)
        ->post(route('settings.agents.run', $this->agentB), ['prompt' => 'hello'])
        ->assertNotFound();

    $this->actingAs($this->ownerA)
        ->delete(route('settings.agents.destroy', $this->agentB))
        ->assertNotFound();

    $this->actingAs($this->ownerA)
        ->get(route('settings.agents.activity', $this->agentB))
        ->assertNotFound();

    $this->assertDatabaseHas('ai_agents', ['id' => $this->agentB->id]);
});

test('the owning team can still update its own agent', function () {
    $this->actingAs($this->ownerB)
        ->patch(route('settings.agents.update', $this->agentB), [
            'name' => 'Renamed Agent',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('ai_agents', [
        'id' => $this->agentB->id,
        'name' => 'Renamed Agent',
    ]);
});

test('a member of the owning team cannot update its agent', function () {
    $member = createTeamUser($this->teamB, 'member');

    $this->actingAs($member)
        ->patch(route('settings.agents.update', $this->agentB), ['name' => 'member rename'])
        ->assertForbidden();

    $this->assertDatabaseHas('ai_agents', [
        'id' => $this->agentB->id,
        'name' => 'Team B Agent',
    ]);
});
