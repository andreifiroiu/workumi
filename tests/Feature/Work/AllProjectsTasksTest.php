<?php

declare(strict_types=1);

use App\Enums\TaskStatus;
use App\Enums\WorkOrderStatus;
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
        'accountable_id' => $this->user->id,
        'status' => WorkOrderStatus::Active,
    ]);
});

test('all projects view hides done, cancelled and archived tasks', function () {
    $common = [
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
    ];

    $visible = Task::factory()->create([...$common, 'status' => TaskStatus::Todo]);
    Task::factory()->create([...$common, 'status' => TaskStatus::Done]);
    Task::factory()->create([...$common, 'status' => TaskStatus::Cancelled]);
    Task::factory()->create([...$common, 'status' => TaskStatus::Archived]);

    $this->actingAs($this->user)->get('/work')
        ->assertStatus(200)
        ->assertInertia(function ($page) use ($visible) {
            $tasks = collect($page->toArray()['props']['tasks']);

            expect($tasks)->toHaveCount(1);
            expect($tasks->first()['id'])->toBe((string) $visible->id);
        });
});
