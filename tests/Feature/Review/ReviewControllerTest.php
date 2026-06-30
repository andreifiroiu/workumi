<?php

use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
use App\Models\Party;
use App\Models\Project;
use App\Models\ReviewSnooze;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;

beforeEach(function () {
    $this->withoutVite();

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
});

function reviewMakeWorkOrder(array $attributes = []): WorkOrder
{
    return WorkOrder::factory()->create(array_merge([
        'team_id' => test()->team->id,
        'project_id' => test()->project->id,
        'created_by_id' => test()->user->id,
        'accountable_id' => test()->user->id,
        'status' => WorkOrderStatus::Active,
        'due_date' => now()->addWeek(),
        'assigned_to_id' => test()->user->id,
    ], $attributes));
}

function reviewMakeTask(WorkOrder $workOrder, array $attributes = []): Task
{
    return Task::factory()->create(array_merge([
        'team_id' => test()->team->id,
        'project_id' => test()->project->id,
        'work_order_id' => $workOrder->id,
        'created_by_id' => test()->user->id,
        'status' => TaskStatus::Todo,
        'assigned_to_id' => null,
        'assigned_agent_id' => null,
    ], $attributes));
}

test('index lists flows with their pending counts', function () {
    reviewMakeWorkOrder(['due_date' => null]);                 // missing due date
    reviewMakeWorkOrder(['assigned_to_id' => null]);           // missing assignee
    reviewMakeTask(reviewMakeWorkOrder(), ['assigned_to_id' => null]); // task missing assignee

    $this->actingAs($this->user)
        ->get('/review')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('review/index')
            ->where('flows.0.key', 'work-orders-missing-due-date')
            ->where('flows.0.count', 1)
            ->where('flows.1.key', 'work-orders-missing-assignee')
            ->where('flows.1.count', 1)
            ->where('flows.2.key', 'tasks-missing-assignee')
            ->where('flows.2.count', 1)
        );
});

test('the overdue flow only counts past-due, non-terminal work orders', function () {
    reviewMakeWorkOrder(['due_date' => now()->subDays(3)]);                              // overdue
    reviewMakeWorkOrder(['due_date' => now()->addWeek()]);                               // future, not overdue
    reviewMakeWorkOrder(['due_date' => null]);                                           // no due date
    reviewMakeWorkOrder(['due_date' => now()->subDays(3), 'status' => WorkOrderStatus::Delivered]); // delivered

    $this->actingAs($this->user)
        ->get('/review/work-orders-overdue')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('review/show')
            ->where('flow.key', 'work-orders-overdue')
            ->has('items', 1)
        );
});

test('apply reschedules an overdue work order', function () {
    $workOrder = reviewMakeWorkOrder(['due_date' => now()->subWeek()]);

    $this->actingAs($this->user)
        ->postJson('/review/work-orders-overdue/apply', [
            'itemId' => $workOrder->id,
            'action' => 'set_due_date',
            'dueDate' => '2026-08-01',
        ])
        ->assertOk();

    expect($workOrder->fresh()->due_date->toDateString())->toBe('2026-08-01');
});

test('index excludes delivered and backlog work orders from counts', function () {
    reviewMakeWorkOrder(['due_date' => null, 'status' => WorkOrderStatus::Delivered]);
    reviewMakeWorkOrder(['due_date' => null, 'status' => WorkOrderStatus::Backlog]);

    $this->actingAs($this->user)
        ->get('/review')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('flows.0.count', 0));
});

test('show returns the items and actions for a flow', function () {
    reviewMakeWorkOrder(['due_date' => null]);
    reviewMakeWorkOrder(['due_date' => null]);

    $this->actingAs($this->user)
        ->get('/review/work-orders-missing-due-date')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('review/show')
            ->where('flow.key', 'work-orders-missing-due-date')
            ->has('flow.actions', 5)
            ->where('flow.actions.2.key', 'next_week')
            ->has('items', 2)
            ->where('currentUserId', (string) $this->user->id)
        );
});

test('unknown flow returns 404', function () {
    $this->actingAs($this->user)
        ->get('/review/not-a-real-flow')
        ->assertNotFound();
});

test('apply set_due_date assigns a due date to the work order', function () {
    $workOrder = reviewMakeWorkOrder(['due_date' => null]);

    $this->actingAs($this->user)
        ->postJson('/review/work-orders-missing-due-date/apply', [
            'itemId' => $workOrder->id,
            'action' => 'set_due_date',
            'dueDate' => '2026-07-15',
        ])
        ->assertOk()
        ->assertJson(['ok' => true]);

    expect($workOrder->fresh()->due_date->toDateString())->toBe('2026-07-15');
});

test('apply assign sets the work order owner', function () {
    $workOrder = reviewMakeWorkOrder(['assigned_to_id' => null]);

    $this->actingAs($this->user)
        ->postJson('/review/work-orders-missing-assignee/apply', [
            'itemId' => $workOrder->id,
            'action' => 'assign',
            'userId' => $this->user->id,
        ])
        ->assertOk();

    expect($workOrder->fresh()->assigned_to_id)->toBe($this->user->id);
});

test('apply assign rejects a user who is not a team member', function () {
    $outsider = User::factory()->create();
    $workOrder = reviewMakeWorkOrder(['assigned_to_id' => null]);

    $this->actingAs($this->user)
        ->postJson('/review/work-orders-missing-assignee/apply', [
            'itemId' => $workOrder->id,
            'action' => 'assign',
            'userId' => $outsider->id,
        ])
        ->assertStatus(422);

    expect($workOrder->fresh()->assigned_to_id)->toBeNull();
});

test('apply assign sets the task assignee', function () {
    $task = reviewMakeTask(reviewMakeWorkOrder(), ['assigned_to_id' => null]);

    $this->actingAs($this->user)
        ->postJson('/review/tasks-missing-assignee/apply', [
            'itemId' => $task->id,
            'action' => 'assign',
            'userId' => $this->user->id,
        ])
        ->assertOk();

    expect($task->fresh()->assigned_to_id)->toBe($this->user->id);
});

test('apply snooze records a snooze and removes the item from the flow', function () {
    $workOrder = reviewMakeWorkOrder(['due_date' => null]);

    $this->actingAs($this->user)
        ->postJson('/review/work-orders-missing-due-date/apply', [
            'itemId' => $workOrder->id,
            'action' => 'snooze',
            'days' => 7,
        ])
        ->assertOk();

    $this->assertDatabaseHas('review_snoozes', [
        'user_id' => $this->user->id,
        'flow' => 'work-orders-missing-due-date',
        'snoozable_type' => WorkOrder::class,
        'snoozable_id' => $workOrder->id,
    ]);

    $this->actingAs($this->user)
        ->get('/review/work-orders-missing-due-date')
        ->assertInertia(fn ($page) => $page->has('items', 0));
});

test('an expired snooze no longer hides the item', function () {
    $workOrder = reviewMakeWorkOrder(['due_date' => null]);

    ReviewSnooze::create([
        'team_id' => $this->team->id,
        'user_id' => $this->user->id,
        'flow' => 'work-orders-missing-due-date',
        'snoozable_type' => WorkOrder::class,
        'snoozable_id' => $workOrder->id,
        'snoozed_until' => now()->subDay(),
    ]);

    $this->actingAs($this->user)
        ->get('/review/work-orders-missing-due-date')
        ->assertInertia(fn ($page) => $page->has('items', 1));
});

test('cannot apply an action to another team\'s work order', function () {
    $otherUser = User::factory()->create();
    $otherTeam = $otherUser->createTeam(['name' => 'Other Team']);
    $otherParty = Party::factory()->create(['team_id' => $otherTeam->id]);
    $otherProject = Project::factory()->create([
        'team_id' => $otherTeam->id,
        'party_id' => $otherParty->id,
        'owner_id' => $otherUser->id,
    ]);
    $foreignWorkOrder = WorkOrder::factory()->create([
        'team_id' => $otherTeam->id,
        'project_id' => $otherProject->id,
        'created_by_id' => $otherUser->id,
        'accountable_id' => $otherUser->id,
        'due_date' => null,
    ]);

    $this->actingAs($this->user)
        ->postJson('/review/work-orders-missing-due-date/apply', [
            'itemId' => $foreignWorkOrder->id,
            'action' => 'set_due_date',
            'dueDate' => '2026-07-15',
        ])
        ->assertNotFound();
});

test('guests are redirected away from review pages', function () {
    $this->get('/review')->assertRedirect('/login');
});
