<?php

declare(strict_types=1);

use App\Models\Project;
use App\Models\User;
use App\Models\WorkOrder;
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
