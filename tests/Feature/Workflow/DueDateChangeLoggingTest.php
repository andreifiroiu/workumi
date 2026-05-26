<?php

declare(strict_types=1);

use App\Models\AIAgent;
use App\Models\Party;
use App\Models\Project;
use App\Models\StatusTransition;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\WorkflowTransitionService;
use Illuminate\Support\Carbon;

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
        'accountable_id' => $this->user->id,
    ]);
    $this->task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $this->workOrder->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);

    $this->service = new WorkflowTransitionService;
});

test('records setting an initial due date (null to date)', function () {
    $toDate = Carbon::parse('2026-06-01');

    $transition = $this->service->recordDueDateChange(
        item: $this->task,
        actor: $this->user,
        fromDate: null,
        toDate: $toDate,
        comment: 'Initial due date set',
    );

    expect(StatusTransition::count())->toBe(1);
    expect($transition->action_type)->toBe('due_date_change');
    expect($transition->isDueDateChange())->toBeTrue();
    expect($transition->transitionable_type)->toBe(Task::class);
    expect($transition->transitionable_id)->toBe($this->task->id);
    expect($transition->user_id)->toBe($this->user->id);
    expect($transition->from_due_date)->toBeNull();
    expect($transition->to_due_date)->toBeInstanceOf(Carbon::class);
    expect($transition->to_due_date->toDateString())->toBe('2026-06-01');
    expect($transition->comment)->toBe('Initial due date set');
});

test('records postponing a due date (date to later date)', function () {
    $transition = $this->service->recordDueDateChange(
        item: $this->workOrder,
        actor: $this->user,
        fromDate: Carbon::parse('2026-06-01'),
        toDate: Carbon::parse('2026-06-15'),
        comment: 'Postponed by two weeks',
    );

    expect(StatusTransition::count())->toBe(1);
    expect($transition->action_type)->toBe('due_date_change');
    expect($transition->transitionable_type)->toBe(WorkOrder::class);
    expect($transition->transitionable_id)->toBe($this->workOrder->id);
    expect($transition->from_due_date->toDateString())->toBe('2026-06-01');
    expect($transition->to_due_date->toDateString())->toBe('2026-06-15');
    expect($transition->comment)->toBe('Postponed by two weeks');
});

test('records clearing a due date without a comment (date to null)', function () {
    $transition = $this->service->recordDueDateChange(
        item: $this->task,
        actor: $this->user,
        fromDate: Carbon::parse('2026-06-01'),
        toDate: null,
    );

    expect(StatusTransition::count())->toBe(1);
    expect($transition->action_type)->toBe('due_date_change');
    expect($transition->from_due_date->toDateString())->toBe('2026-06-01');
    expect($transition->to_due_date)->toBeNull();
    expect($transition->comment)->toBeNull();
});

test('records the actor as null for an AI agent, mirroring assignment changes', function () {
    $agent = AIAgent::factory()->create();

    $transition = $this->service->recordDueDateChange(
        item: $this->task,
        actor: $agent,
        fromDate: null,
        toDate: Carbon::parse('2026-07-01'),
        comment: null,
    );

    expect(StatusTransition::count())->toBe(1);
    expect($transition->user_id)->toBeNull();
    expect($transition->action_type)->toBe('due_date_change');
    expect($transition->to_due_date->toDateString())->toBe('2026-07-01');
});
