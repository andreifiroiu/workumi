<?php

declare(strict_types=1);

use App\Models\Deliverable;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderList;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * The web app enforces the same rules as the API and MCP: a private project is
 * limited to the people with a RACI role on it, and a work order inside one is
 * limited to those people plus anyone with a role on the work order itself.
 */
beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->team = $this->owner->createTeam(['name' => 'Alpha']);
    $this->owner->forceFill(['current_team_id' => $this->team->id])->save();

    $this->outsider = User::factory()->create();
    $this->team->addUser($this->outsider, 'member');
    $this->outsider->forceFill(['current_team_id' => $this->team->id])->save();

    $this->private = Project::factory()->create([
        'team_id' => $this->team->id, 'name' => 'Secret Project', 'status' => 'active',
        'is_private' => true, 'owner_id' => $this->owner->id,
        'accountable_id' => $this->owner->id, 'responsible_id' => $this->owner->id,
        'consulted_ids' => [], 'informed_ids' => [],
    ]);

    $this->open = Project::factory()->create([
        'team_id' => $this->team->id, 'name' => 'Open Project', 'status' => 'active',
        'is_private' => false, 'owner_id' => $this->owner->id,
    ]);

    $this->hiddenWorkOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id, 'project_id' => $this->private->id,
        'title' => 'Hidden Work Order', 'assigned_to_id' => $this->owner->id,
        'created_by_id' => $this->owner->id, 'accountable_id' => $this->owner->id, 'status' => 'active',
        'consulted_ids' => [], 'informed_ids' => [],
    ]);
});

test('a private project page is refused to a teammate with no role', function () {
    $this->actingAs($this->outsider)
        ->get(route('projects.show', $this->private->id))
        ->assertForbidden();

    $this->actingAs($this->owner)
        ->get(route('projects.show', $this->private->id))
        ->assertOk();
});

test('a work order inside a private project is refused to a teammate with no role', function () {
    $this->actingAs($this->outsider)
        ->get(route('work-orders.show', $this->hiddenWorkOrder->id))
        ->assertForbidden();

    $this->actingAs($this->owner)
        ->get(route('work-orders.show', $this->hiddenWorkOrder->id))
        ->assertOk();
});

test('being assigned the work order opens it without opening the project', function () {
    $assignee = User::factory()->create();
    $this->team->addUser($assignee, 'member');
    $assignee->forceFill(['current_team_id' => $this->team->id])->save();

    $this->hiddenWorkOrder->forceFill(['assigned_to_id' => $assignee->id])->save();

    $this->actingAs($assignee)
        ->get(route('work-orders.show', $this->hiddenWorkOrder->id))
        ->assertOk();

    $this->actingAs($assignee)
        ->get(route('projects.show', $this->private->id))
        ->assertForbidden();
});

test('a work order in a non-private project stays open to the whole team', function () {
    $open = WorkOrder::factory()->create([
        'team_id' => $this->team->id, 'project_id' => $this->open->id,
        'title' => 'Open Work Order', 'assigned_to_id' => $this->owner->id,
        'created_by_id' => $this->owner->id, 'accountable_id' => $this->owner->id, 'status' => 'active',
        'consulted_ids' => [], 'informed_ids' => [],
    ]);

    $this->actingAs($this->outsider)
        ->get(route('work-orders.show', $open->id))
        ->assertOk();
});

test('the work index hides both the private project and its work orders', function () {
    $this->actingAs($this->outsider)
        ->get(route('work'))
        ->assertOk()
        ->assertInertia(function (Assert $page) {
            $projects = collect($page->toArray()['props']['projects'] ?? []);
            $workOrders = collect($page->toArray()['props']['workOrders'] ?? []);

            expect($projects->pluck('name'))->not->toContain('Secret Project')
                ->and($projects->pluck('name'))->toContain('Open Project')
                ->and($workOrders->pluck('title'))->not->toContain('Hidden Work Order');
        });
});

test('the owner still sees the private project and its work orders on the work index', function () {
    $this->actingAs($this->owner)
        ->get(route('work'))
        ->assertOk()
        ->assertInertia(function (Assert $page) {
            $projects = collect($page->toArray()['props']['projects'] ?? []);
            $workOrders = collect($page->toArray()['props']['workOrders'] ?? []);

            expect($projects->pluck('name'))->toContain('Secret Project')
                ->and($workOrders->pluck('title'))->toContain('Hidden Work Order');
        });
});

test('the task and deliverable detail pages of a hidden work order are refused', function () {
    // Hiding these from the board is not enough on its own — the detail pages
    // are reachable by direct URL and authorize through their own policies.
    $task = Task::factory()->create([
        'team_id' => $this->team->id, 'work_order_id' => $this->hiddenWorkOrder->id,
        'project_id' => $this->private->id, 'title' => 'Hidden Task',
        'assigned_to_id' => $this->owner->id, 'status' => 'todo',
    ]);

    $deliverable = Deliverable::factory()->create([
        'team_id' => $this->team->id, 'work_order_id' => $this->hiddenWorkOrder->id,
        'project_id' => $this->private->id, 'title' => 'Hidden Deliverable',
    ]);

    $this->actingAs($this->outsider)->get(route('tasks.show', $task->id))->assertForbidden();
    $this->actingAs($this->outsider)->get(route('deliverables.show', $deliverable->id))->assertForbidden();

    $this->actingAs($this->owner)->get(route('tasks.show', $task->id))->assertOk();

    expect($this->outsider->can('update', $task))->toBeFalse()
        ->and($this->outsider->can('delete', $task))->toBeFalse()
        ->and($this->outsider->can('update', $deliverable))->toBeFalse();
});

test('a task assignee reaches their task even inside a hidden work order', function () {
    $assignee = User::factory()->create();
    $this->team->addUser($assignee, 'member');
    $assignee->forceFill(['current_team_id' => $this->team->id])->save();

    $task = Task::factory()->create([
        'team_id' => $this->team->id, 'work_order_id' => $this->hiddenWorkOrder->id,
        'project_id' => $this->private->id, 'title' => 'My Task',
        'assigned_to_id' => $assignee->id, 'status' => 'todo',
    ]);

    $this->actingAs($assignee)->get(route('tasks.show', $task->id))->assertOk();
    $this->actingAs($assignee)->get(route('work-orders.show', $this->hiddenWorkOrder->id))->assertForbidden();
});

test('mention search does not autocomplete hidden work items', function () {
    $response = $this->actingAs($this->outsider)->getJson('/api/mentions/search?q=Hidden');

    $response->assertOk();

    expect(collect($response->json('workItems'))->pluck('name'))
        ->not->toContain('Hidden Work Order')
        ->not->toContain('Secret Project');

    // The owner still gets their own work surfaced.
    $ownerResults = $this->actingAs($this->owner)->getJson('/api/mentions/search?q=Hidden');

    expect(collect($ownerResults->json('workItems'))->pluck('name'))->toContain('Hidden Work Order');
});

test('the work order lists of a hidden project are closed', function () {
    // moveWorkOrder authorizes the list, so a team-only list policy would let a
    // teammate shuffle work orders inside a project they cannot see.
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id, 'project_id' => $this->private->id, 'name' => 'Hidden List',
    ]);

    expect($this->outsider->can('view', $list))->toBeFalse()
        ->and($this->outsider->can('update', $list))->toBeFalse()
        ->and($this->outsider->can('delete', $list))->toBeFalse()
        ->and($this->owner->can('update', $list))->toBeTrue();

    $this->actingAs($this->outsider)
        ->post(route('work-order-lists.move-work-order', $list->id), [
            'workOrderId' => $this->hiddenWorkOrder->id,
        ])
        ->assertForbidden();

    expect($this->hiddenWorkOrder->fresh()->work_order_list_id)->not->toBe($list->id);
});

test('a teammate cannot update or delete a work order they cannot see', function () {
    expect($this->outsider->can('view', $this->hiddenWorkOrder))->toBeFalse()
        ->and($this->outsider->can('update', $this->hiddenWorkOrder))->toBeFalse()
        ->and($this->outsider->can('delete', $this->hiddenWorkOrder))->toBeFalse()
        ->and($this->outsider->can('update', $this->private))->toBeFalse()
        ->and($this->outsider->can('delete', $this->private))->toBeFalse();

    expect($this->owner->can('view', $this->hiddenWorkOrder))->toBeTrue()
        ->and($this->owner->can('update', $this->hiddenWorkOrder))->toBeTrue()
        ->and($this->owner->can('update', $this->private))->toBeTrue();
});
