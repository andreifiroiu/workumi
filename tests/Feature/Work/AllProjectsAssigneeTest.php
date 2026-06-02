<?php

declare(strict_types=1);

use App\Enums\WorkOrderStatus;
use App\Models\Party;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderList;

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
});

test('all projects view shows the accountable user for work orders without an explicit assignee', function () {
    $list = WorkOrderList::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
    ]);

    // Both work orders have an accountable but no assigned_to_id — the common
    // case after creation. The All projects view must still show a name.
    $common = [
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'accountable_id' => $this->user->id,
        'assigned_to_id' => null,
        'status' => WorkOrderStatus::Active,
    ];

    WorkOrder::factory()->create([...$common, 'work_order_list_id' => $list->id]);
    WorkOrder::factory()->create([...$common, 'work_order_list_id' => null]);

    $this->actingAs($this->user)->get('/work')
        ->assertStatus(200)
        ->assertInertia(function ($page) {
            $project = collect($page->toArray()['props']['projects'])
                ->firstWhere('id', (string) $this->project->id);

            $workOrders = collect($project['workOrderLists'])
                ->flatMap(fn ($list) => $list['workOrders'])
                ->merge($project['ungroupedWorkOrders']);

            expect($workOrders)->toHaveCount(2);
            $workOrders->each(
                fn ($workOrder) => expect($workOrder['assignedToName'])->toBe($this->user->name)
            );
        });
});
