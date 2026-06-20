<?php

declare(strict_types=1);

use App\Models\Party;
use App\Models\Project;
use App\Models\User;
use App\Models\UserPreference;
use App\Models\WorkOrder;
use Carbon\Carbon;

beforeEach(function () {
    $this->withoutVite();

    $this->user = User::factory()->create();
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->current_team_id = $this->team->id;
    $this->user->save();

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
    $this->project = Project::factory()->active()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
        'accountable_id' => $this->user->id,
    ]);

    // A backlogged work order with an imminent due date.
    $this->backlog = WorkOrder::factory()->backlog()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'accountable_id' => $this->user->id,
        'responsible_id' => $this->user->id,
        'due_date' => Carbon::today()->addDays(2),
    ]);

    // A control (active) work order with the same due date that must stay visible everywhere.
    $this->control = WorkOrder::factory()->active()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'accountable_id' => $this->user->id,
        'responsible_id' => $this->user->id,
        'due_date' => Carbon::today()->addDays(2),
    ]);
});

test('a backlogged work order still appears on the project detail page', function () {
    $this->actingAs($this->user)
        ->get(route('projects.show', $this->project))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('workOrders', 2));
});

test('a backlogged work order is hidden from Today upcoming deadlines despite a due date', function () {
    $this->actingAs($this->user)
        ->get(route('today'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('upcomingDeadlines', 1)
            ->where('upcomingDeadlines.0.id', (string) $this->control->id)
        );
});

test('a backlogged work order is hidden from the All Work Orders list', function () {
    $this->actingAs($this->user)
        ->get(route('work'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('workOrders', 1)
            ->where('workOrders.0.id', (string) $this->control->id)
        );
});

test('a backlogged work order is hidden from My Work', function () {
    UserPreference::set($this->user, 'work_view', 'my_work');

    $this->actingAs($this->user)
        ->get(route('work'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('myWorkData.workOrders', 1)
            ->where('myWorkData.workOrders.0.id', (string) $this->control->id)
        );
});
