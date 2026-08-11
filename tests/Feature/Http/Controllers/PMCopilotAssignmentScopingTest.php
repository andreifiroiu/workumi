<?php

declare(strict_types=1);

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

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
    $this->project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);
    $this->workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);
    $this->task = Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
        'assigned_to_id' => null,
    ]);

    $this->outsider = User::factory()->create();
    $this->outsider->createTeam(['name' => 'Other Team']);

    $this->assignUrl = "/work/work-orders/{$this->workOrder->id}/pm-copilot/tasks/{$this->task->id}/assign";
    $this->bulkUrl = "/work/work-orders/{$this->workOrder->id}/pm-copilot/bulk-assign";
});

test('assigning a task accepts a team member', function () {
    $member = addTeamMember($this->team);

    $this->actingAs($this->user)
        ->postJson($this->assignUrl, [
            'assignee_type' => 'user',
            'assignee_id' => $member->id,
        ])
        ->assertOk();

    expect($this->task->fresh()->assigned_to_id)->toBe($member->id);
});

test('assigning a task rejects a user from another team', function () {
    $this->actingAs($this->user)
        ->postJson($this->assignUrl, [
            'assignee_type' => 'user',
            'assignee_id' => $this->outsider->id,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('assignee_id');

    expect($this->task->fresh()->assigned_to_id)->toBeNull();
});

test('assigning a task rejects a user id that does not exist', function () {
    // The rule was `required|integer` with no `exists` at all, so any integer
    // landed in assigned_to_id.
    $this->actingAs($this->user)
        ->postJson($this->assignUrl, [
            'assignee_type' => 'user',
            'assignee_id' => 999999,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('assignee_id');

    expect($this->task->fresh()->assigned_to_id)->toBeNull();
});

test('bulk assignment rejects a user from another team', function () {
    $this->actingAs($this->user)
        ->postJson($this->bulkUrl, [
            'assignments' => [
                [
                    'task_id' => $this->task->id,
                    'assignee_type' => 'user',
                    'assignee_id' => $this->outsider->id,
                ],
            ],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('assignments.0.assignee_id');

    expect($this->task->fresh()->assigned_to_id)->toBeNull();
});

test('assigning a task accepts an agent enabled for the team', function () {
    $agent = AIAgent::factory()->create();
    AgentConfiguration::factory()->enabled()->create([
        'team_id' => $this->team->id,
        'ai_agent_id' => $agent->id,
    ]);

    $this->actingAs($this->user)
        ->postJson($this->assignUrl, [
            'assignee_type' => 'agent',
            'assignee_id' => $agent->id,
        ])
        ->assertOk();

    expect($this->task->fresh()->assigned_agent_id)->toBe($agent->id);
});

test('assigning a task rejects an agent that is not enabled for the team', function () {
    $agent = AIAgent::factory()->create();
    AgentConfiguration::factory()->create([
        'team_id' => $this->team->id,
        'ai_agent_id' => $agent->id,
        'enabled' => false,
    ]);

    $this->actingAs($this->user)
        ->postJson($this->assignUrl, [
            'assignee_type' => 'agent',
            'assignee_id' => $agent->id,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('assignee_id');

    expect($this->task->fresh()->assigned_agent_id)->toBeNull();
});

test('assigning a task rejects an agent configured for another team', function () {
    $agent = AIAgent::factory()->create();
    $otherTeam = $this->outsider->currentTeam;
    AgentConfiguration::factory()->enabled()->create([
        'team_id' => $otherTeam->id,
        'ai_agent_id' => $agent->id,
    ]);

    $this->actingAs($this->user)
        ->postJson($this->assignUrl, [
            'assignee_type' => 'agent',
            'assignee_id' => $agent->id,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('assignee_id');

    expect($this->task->fresh()->assigned_agent_id)->toBeNull();
});

test('a missing assignee type does not report a membership failure it never tested', function () {
    // The rule branches on the sibling field; without one there is no domain to
    // check, so it must stay quiet rather than assert the id is not a team member.
    $this->actingAs($this->user)
        ->postJson($this->assignUrl, ['assignee_id' => $this->user->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('assignee_type')
        ->assertJsonMissingValidationErrors('assignee_id');
});

test('bulk assignment resolves each row against its own assignee type', function () {
    // The rule derives its sibling from the attribute path, so a mixed batch is
    // the case that would break a naive lookup.
    $member = addTeamMember($this->team);
    $secondTask = Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
    ]);

    $agent = AIAgent::factory()->create();
    AgentConfiguration::factory()->enabled()->create([
        'team_id' => $this->team->id,
        'ai_agent_id' => $agent->id,
    ]);

    $this->actingAs($this->user)
        ->postJson($this->bulkUrl, [
            'assignments' => [
                ['task_id' => $this->task->id, 'assignee_type' => 'agent', 'assignee_id' => $agent->id],
                ['task_id' => $secondTask->id, 'assignee_type' => 'user', 'assignee_id' => $member->id],
            ],
        ])
        ->assertOk();

    expect($this->task->fresh()->assigned_agent_id)->toBe($agent->id)
        ->and($secondTask->fresh()->assigned_to_id)->toBe($member->id);
});

test('bulk assignment reports the offending row when types are mixed', function () {
    $secondTask = Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
    ]);

    $agent = AIAgent::factory()->create();
    AgentConfiguration::factory()->enabled()->create([
        'team_id' => $this->team->id,
        'ai_agent_id' => $agent->id,
    ]);

    $this->actingAs($this->user)
        ->postJson($this->bulkUrl, [
            'assignments' => [
                ['task_id' => $this->task->id, 'assignee_type' => 'agent', 'assignee_id' => $agent->id],
                ['task_id' => $secondTask->id, 'assignee_type' => 'user', 'assignee_id' => $this->outsider->id],
            ],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('assignments.1.assignee_id')
        ->assertJsonMissingValidationErrors('assignments.0.assignee_id');
});

test('bulk assignment accepts the same task named twice', function () {
    // The ownership check counts fetched rows against submitted ids, so a repeat
    // used to be reported as "does not belong to this work order".
    $member = addTeamMember($this->team);

    $this->actingAs($this->user)
        ->postJson($this->bulkUrl, [
            'assignments' => [
                ['task_id' => $this->task->id, 'assignee_type' => 'user', 'assignee_id' => $member->id],
                ['task_id' => $this->task->id, 'assignee_type' => 'user', 'assignee_id' => $member->id],
            ],
        ])
        ->assertOk();
});

test('a viewer cannot assign work through the copilot endpoints', function () {
    // Assignment is a write; these two endpoints were gated on `view`.
    $viewer = addTeamMember($this->team, roleCode: 'viewer');

    $this->actingAs($viewer)
        ->postJson($this->assignUrl, [
            'assignee_type' => 'user',
            'assignee_id' => $this->user->id,
        ])
        ->assertForbidden();

    expect($this->task->fresh()->assigned_to_id)->toBeNull();
});
