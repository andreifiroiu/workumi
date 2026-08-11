<?php

declare(strict_types=1);

use App\Enums\TaskStatus;
use App\Models\AgentConfiguration;
use App\Models\AIAgent;
use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->current_team_id = $this->team->id;
    $this->user->save();
});

test('a solo owner can still assign work to themselves', function () {
    // Nobody has been invited yet, so `team_user` is empty and a pivot-only
    // lookup returns an assignee picker with no one in it.
    $this->actingAs($this->user)->get('/work')
        ->assertStatus(200)
        ->assertInertia(function ($page) {
            $members = collect($page->toArray()['props']['teamMembers']);

            expect($members->pluck('id'))->toContain((string) $this->user->id);
        });
});

test('the work view lists the team owner among the assignable members', function () {
    // Owners are not written to team_user, so they only appear if pushed in
    // explicitly — without them the create-task assignee picker is empty on a
    // team the owner has not yet invited anyone to.
    $member = addTeamMember($this->team);

    $this->actingAs($this->user)->get('/work')
        ->assertStatus(200)
        ->assertInertia(function ($page) use ($member) {
            $ids = collect($page->toArray()['props']['teamMembers'])->pluck('id');

            expect($ids)->toContain((string) $this->user->id)
                ->and($ids)->toContain((string) $member->id)
                ->and($ids->duplicates())->toBeEmpty();
        });
});

test('the work view offers only the agents this team has enabled', function () {
    // The all-projects task edit dialog assigns work to AI agents, so it needs
    // the same team-scoped roster the work order page uses — an agent another
    // team enabled must not be assignable here.
    $ours = AIAgent::factory()->create(['name' => 'Research Bot']);
    AgentConfiguration::factory()->enabled()->create([
        'team_id' => $this->team->id,
        'ai_agent_id' => $ours->id,
    ]);

    $disabled = AIAgent::factory()->create(['name' => 'Dormant Bot']);
    AgentConfiguration::factory()->create([
        'team_id' => $this->team->id,
        'ai_agent_id' => $disabled->id,
    ]);

    $theirs = AIAgent::factory()->create(['name' => 'Other Team Bot']);
    AgentConfiguration::factory()->enabled()->create([
        'ai_agent_id' => $theirs->id,
    ]);

    $this->actingAs($this->user)->get('/work')
        ->assertStatus(200)
        ->assertInertia(function ($page) {
            $names = collect($page->toArray()['props']['availableAgents'])->pluck('name');

            expect($names)->toContain('Research Bot')
                ->and($names)->not->toContain('Dormant Bot')
                ->and($names)->not->toContain('Other Team Bot');
        });
});

test('the work view exposes each task agent assignment', function () {
    // The all-projects edit dialog reads the assignment back before writing it,
    // so a task payload without the agent shows an agent-assigned task as
    // unassigned — and the next save clears the agent for real.
    $project = Project::factory()->active()->create([
        'team_id' => $this->team->id,
        'party_id' => Party::factory()->create(['team_id' => $this->team->id])->id,
        'owner_id' => $this->user->id,
    ]);
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $project->id,
        'created_by_id' => $this->user->id,
    ]);
    $agent = AIAgent::factory()->create(['name' => 'Research Bot']);
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $project->id,
        'work_order_id' => $workOrder->id,
        'status' => TaskStatus::Todo,
        'assigned_to_id' => null,
        'assigned_agent_id' => $agent->id,
    ]);

    $this->actingAs($this->user)->get('/work')
        ->assertStatus(200)
        ->assertInertia(function ($page) use ($task, $agent) {
            $payload = collect($page->toArray()['props']['tasks'])
                ->firstWhere('id', (string) $task->id);

            expect($payload['assignedAgentId'])->toBe((string) $agent->id)
                ->and($payload['assignedAgentName'])->toBe('Research Bot');
        });
});
