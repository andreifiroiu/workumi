<?php

declare(strict_types=1);

use App\Enums\TaskStatus;
use App\Models\InboxItem;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use Carbon\Carbon;

beforeEach(function () {
    $this->withoutVite();

    $this->user = User::factory()->create();
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->current_team_id = $this->team->id;
    $this->user->save();

    $this->project = Project::factory()->create([
        'team_id' => $this->team->id,
        'owner_id' => $this->user->id,
    ]);
    $this->workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);
});

function makeTask(array $attributes): Task
{
    return Task::factory()->create(array_merge([
        'team_id' => test()->team->id,
        'project_id' => test()->project->id,
        'work_order_id' => test()->workOrder->id,
        'assigned_to_id' => test()->user->id,
        'status' => TaskStatus::Todo,
        'is_blocked' => false,
    ], $attributes));
}

test('a task due today is not overdue but flagged as due today', function () {
    makeTask(['due_date' => Carbon::today()]);

    $this->actingAs($this->user)
        ->get(route('today'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('tasks.0.isOverdue', false)
            ->where('tasks.0.isDueToday', true)
        );
});

test('a task due in the past is overdue and not due today', function () {
    makeTask(['due_date' => Carbon::yesterday()]);

    $this->actingAs($this->user)
        ->get(route('today'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('tasks.0.isOverdue', true)
            ->where('tasks.0.isDueToday', false)
        );
});

test('a task due in the future is neither overdue nor due today', function () {
    makeTask(['due_date' => Carbon::tomorrow()]);

    $this->actingAs($this->user)
        ->get(route('today'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('tasks.0.isOverdue', false)
            ->where('tasks.0.isDueToday', false)
        );
});

test('the daily summary does not count tasks due today as overdue', function () {
    makeTask(['due_date' => Carbon::today()]);

    $this->actingAs($this->user)
        ->get(route('today'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('dailySummary.summary', "You're all caught up! Check your upcoming deadlines.")
        );
});

test('tasks are ordered overdue first, then due today, then upcoming', function () {
    makeTask(['title' => 'Upcoming task', 'due_date' => Carbon::tomorrow()]);
    makeTask(['title' => 'Due today task', 'due_date' => Carbon::today()]);
    makeTask(['title' => 'Overdue task', 'due_date' => Carbon::yesterday()]);

    $this->actingAs($this->user)
        ->get(route('today'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('tasks.0.title', 'Overdue task')
            ->where('tasks.1.title', 'Due today task')
            ->where('tasks.2.title', 'Upcoming task')
        );
});

test('an approval carries the work order id its row links to', function () {
    InboxItem::factory()->approval()->create([
        'team_id' => $this->team->id,
        'related_work_order_id' => $this->workOrder->id,
        'related_project_id' => $this->project->id,
    ]);

    $this->actingAs($this->user)
        ->get(route('today'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('approvals.0.workOrderId', (string) $this->workOrder->id)
        );
});

test('approvals for a private project are hidden from team members who cannot open them', function () {
    $privateProject = Project::factory()->private()->create([
        'team_id' => $this->team->id,
        'owner_id' => $this->user->id,
    ]);
    $privateWorkOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $privateProject->id,
        'assigned_to_id' => $this->user->id,
        'created_by_id' => $this->user->id,
    ]);
    InboxItem::factory()->approval()->create([
        'team_id' => $this->team->id,
        'title' => 'Approve the private plan',
        'related_work_order_id' => $privateWorkOrder->id,
        'related_project_id' => $privateProject->id,
    ]);

    $outsider = addTeamMember($this->team);

    $this->actingAs($outsider)
        ->get(route('today'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('approvals', 0)
            ->where('metrics.approvalsPending', 0)
        );

    $this->actingAs($this->user)
        ->get(route('today'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('approvals', 1)
            ->where('approvals.0.title', 'Approve the private plan')
            ->where('metrics.approvalsPending', 1)
        );
});

test('an approval with no related work order or project stays visible to the team', function () {
    InboxItem::factory()->approval()->create([
        'team_id' => $this->team->id,
        'title' => 'Team-wide approval',
        'related_work_order_id' => null,
        'related_project_id' => null,
    ]);

    $this->actingAs(addTeamMember($this->team))
        ->get(route('today'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('approvals', 1)
            ->where('approvals.0.workOrderId', '')
        );
});
