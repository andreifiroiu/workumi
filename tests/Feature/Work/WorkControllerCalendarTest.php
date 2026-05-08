<?php

use App\Enums\WorkOrderStatus;
use App\Models\Party;
use App\Models\Project;
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
});

test('archived work orders are excluded from work page workOrders prop', function () {
    $active = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'title' => 'Active Work Order',
        'status' => WorkOrderStatus::Active,
    ]);

    $archived = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'title' => 'Archived Work Order',
        'status' => WorkOrderStatus::Archived,
    ]);

    $response = $this->actingAs($this->user)->get('/work');

    $response->assertStatus(200);
    $response->assertInertia(function ($page) use ($active, $archived) {
        $workOrders = collect($page->toArray()['props']['workOrders']);
        $ids = $workOrders->pluck('id')->all();

        expect($ids)->toContain((string) $active->id);
        expect($ids)->not->toContain((string) $archived->id);
    });
});

test('non-archived work orders are included in work page workOrders prop', function () {
    $statuses = [
        WorkOrderStatus::Draft,
        WorkOrderStatus::Active,
        WorkOrderStatus::InReview,
        WorkOrderStatus::Approved,
        WorkOrderStatus::Delivered,
        WorkOrderStatus::Blocked,
        WorkOrderStatus::Cancelled,
        WorkOrderStatus::RevisionRequested,
    ];

    $created = collect($statuses)->map(fn (WorkOrderStatus $status) => WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'status' => $status,
    ]));

    $response = $this->actingAs($this->user)->get('/work');

    $response->assertStatus(200);
    $response->assertInertia(function ($page) use ($created) {
        $workOrders = collect($page->toArray()['props']['workOrders']);
        $ids = $workOrders->pluck('id')->all();

        foreach ($created as $workOrder) {
            expect($ids)->toContain((string) $workOrder->id);
        }
    });
});
