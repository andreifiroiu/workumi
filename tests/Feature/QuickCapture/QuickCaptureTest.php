<?php

use App\Models\Document;
use App\Models\Party;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');

    $this->user = User::factory()->create();
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->current_team_id = $this->team->id;
    $this->user->save();

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
    // Pinned: the factory randomises status across every case including
    // archived, which capture options and the parser both filter out.
    $this->project = Project::factory()->active()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);
    $this->workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);
});

test('user can capture a project', function () {
    $this->actingAs($this->user)->post('/capture', [
        'type' => 'project',
        'title' => 'Captured Project',
        'partyId' => $this->party->id,
    ])->assertRedirect();

    $this->assertDatabaseHas('projects', [
        'name' => 'Captured Project',
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
        'status' => 'active',
    ]);
});

test('user can capture a work order', function () {
    $this->actingAs($this->user)->post('/capture', [
        'type' => 'work_order',
        'title' => 'Captured Work Order',
        'projectId' => $this->project->id,
    ])->assertRedirect();

    $this->assertDatabaseHas('work_orders', [
        'title' => 'Captured Work Order',
        'project_id' => $this->project->id,
        'team_id' => $this->team->id,
        'status' => 'draft',
        'priority' => 'medium',
    ]);
});

test('user can capture a task', function () {
    $this->actingAs($this->user)->post('/capture', [
        'type' => 'task',
        'title' => 'Captured Task',
        'workOrderId' => $this->workOrder->id,
    ])->assertRedirect();

    $this->assertDatabaseHas('tasks', [
        'title' => 'Captured Task',
        'work_order_id' => $this->workOrder->id,
        'project_id' => $this->project->id,
        'team_id' => $this->team->id,
        'status' => 'todo',
    ]);
});

/**
 * Capture is deliberately looser than the full create-task dialog, which still
 * requires a due date.
 */
test('a captured task may have no due date', function () {
    $this->actingAs($this->user)->post('/capture', [
        'type' => 'task',
        'title' => 'Someday Task',
        'workOrderId' => $this->workOrder->id,
    ])->assertRedirect();

    $this->assertDatabaseHas('tasks', [
        'title' => 'Someday Task',
        'due_date' => null,
    ]);
});

test('user can capture a note filed under a work order', function () {
    $this->actingAs($this->user)->post('/capture', [
        'type' => 'note',
        'title' => 'Kickoff notes',
        'description' => '# Agenda',
        'workOrderId' => $this->workOrder->id,
    ])->assertRedirect();

    $this->assertDatabaseHas('documents', [
        'name' => 'Kickoff notes.md',
        'team_id' => $this->team->id,
        'type' => 'note',
        'documentable_type' => WorkOrder::class,
        'documentable_id' => $this->workOrder->id,
    ]);

    $document = Document::where('name', 'Kickoff notes.md')->firstOrFail();
    Storage::disk('public')->assertExists("work-orders/{$this->workOrder->id}/notes/note-{$document->id}.md");
});

/**
 * An unparented note belongs to the team and is what the Documents section
 * lists at its root.
 */
test('user can capture a note with no parent', function () {
    $this->actingAs($this->user)->post('/capture', [
        'type' => 'note',
        'title' => 'Loose thought',
        'description' => 'Remember this',
    ])->assertRedirect();

    $this->assertDatabaseHas('documents', [
        'name' => 'Loose thought.md',
        'team_id' => $this->team->id,
        'type' => 'note',
        'documentable_type' => null,
        'documentable_id' => null,
    ]);

    $this->actingAs($this->user)->get('/documents')
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page->component('documents/index')
            ->where('documents.0.name', 'Loose thought.md')
        );
});

test('capture rejects a work order parent from another team', function () {
    $otherUser = User::factory()->create();
    $otherTeam = $otherUser->createTeam(['name' => 'Other Team']);
    $otherParty = Party::factory()->create(['team_id' => $otherTeam->id]);
    $otherProject = Project::factory()->active()->create([
        'team_id' => $otherTeam->id,
        'party_id' => $otherParty->id,
        'owner_id' => $otherUser->id,
    ]);
    $otherWorkOrder = WorkOrder::factory()->create([
        'team_id' => $otherTeam->id,
        'project_id' => $otherProject->id,
        'created_by_id' => $otherUser->id,
    ]);

    $this->actingAs($this->user)->post('/capture', [
        'type' => 'task',
        'title' => 'Cross Team Task',
        'workOrderId' => $otherWorkOrder->id,
    ])->assertSessionHasErrors('workOrderId');

    $this->assertDatabaseMissing('tasks', ['title' => 'Cross Team Task']);
});

test('capture rejects a party from another team', function () {
    $otherUser = User::factory()->create();
    $otherTeam = $otherUser->createTeam(['name' => 'Other Team']);
    $otherParty = Party::factory()->create(['team_id' => $otherTeam->id]);

    $this->actingAs($this->user)->post('/capture', [
        'type' => 'project',
        'title' => 'Cross Team Project',
        'partyId' => $otherParty->id,
    ])->assertSessionHasErrors('partyId');

    $this->assertDatabaseMissing('projects', ['name' => 'Cross Team Project']);
});

test('a viewer cannot capture', function () {
    $viewer = createTeamUser($this->team, 'viewer');

    $this->actingAs($viewer)->post('/capture', [
        'type' => 'task',
        'title' => 'Viewer Task',
        'workOrderId' => $this->workOrder->id,
    ])->assertStatus(403);

    $this->assertDatabaseMissing('tasks', ['title' => 'Viewer Task']);
});

test('a viewer cannot capture a note either', function () {
    $viewer = createTeamUser($this->team, 'viewer');

    $this->actingAs($viewer)->post('/capture', [
        'type' => 'note',
        'title' => 'Viewer Note',
    ])->assertStatus(403);

    $this->assertDatabaseMissing('documents', ['name' => 'Viewer Note.md']);
});

test('capture options only list the current team records', function () {
    $otherUser = User::factory()->create();
    $otherTeam = $otherUser->createTeam(['name' => 'Other Team']);
    $otherParty = Party::factory()->create(['team_id' => $otherTeam->id, 'name' => 'Hidden Party']);
    Project::factory()->active()->create([
        'team_id' => $otherTeam->id,
        'party_id' => $otherParty->id,
        'owner_id' => $otherUser->id,
        'name' => 'Hidden Project',
    ]);

    $response = $this->actingAs($this->user)->getJson('/capture/options');

    $response->assertStatus(200);

    expect(collect($response->json('projects'))->pluck('name'))
        ->toContain($this->project->name)
        ->not->toContain('Hidden Project');

    expect(collect($response->json('parties'))->pluck('name'))
        ->not->toContain('Hidden Party');

    expect(collect($response->json('workOrders'))->pluck('id'))
        ->toContain((string) $this->workOrder->id);
});

/**
 * `description` lands in a MySQL `text` column (65,535 bytes) for everything but
 * a note, whose body goes to disk. Without a per-type limit a long paste passed
 * validation and then died in the driver. SQLite has no such limit, so only the
 * rule itself can be asserted here.
 */
test('a captured task rejects a description too large for its column', function () {
    $this->actingAs($this->user)->post('/capture', [
        'type' => 'task',
        'title' => 'Huge Task',
        'workOrderId' => $this->workOrder->id,
        'description' => str_repeat('a', 10001),
    ])->assertSessionHasErrors('description');

    $this->assertDatabaseMissing('tasks', ['title' => 'Huge Task']);
});

test('a captured note accepts a long body because it is stored on disk', function () {
    $this->actingAs($this->user)->post('/capture', [
        'type' => 'note',
        'title' => 'Long Note',
        'description' => str_repeat('a', 10001),
    ])->assertRedirect()->assertSessionHasNoErrors();

    $this->assertDatabaseHas('documents', ['name' => 'Long Note.md']);
});

/**
 * position_in_list sorts NULL first, so a captured work order with no position
 * jumped above every existing card in the project's ungrouped column.
 */
test('a captured work order lands at the end of the ungrouped column', function () {
    $existing = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'work_order_list_id' => null,
        'position_in_list' => 100,
    ]);

    $this->actingAs($this->user)->post('/capture', [
        'type' => 'work_order',
        'title' => 'Later Work Order',
        'projectId' => $this->project->id,
    ])->assertRedirect();

    $captured = WorkOrder::where('title', 'Later Work Order')->firstOrFail();

    expect($captured->position_in_list)->toBeGreaterThan($existing->position_in_list);
});

/**
 * The Documents listing shows only unfiled documents, so a note filed under a
 * work order is reachable through that work order, not through /documents.
 */
test('a filed note links to its parent rather than the documents list', function () {
    $this->actingAs($this->user)->post('/capture', [
        'type' => 'note',
        'title' => 'Filed note',
        'workOrderId' => $this->workOrder->id,
    ])->assertRedirect();

    expect(session('capture')['url'])->toBe(route('work-orders.show', $this->workOrder->id));
});

test('an unfiled note links to the documents list', function () {
    $this->actingAs($this->user)->post('/capture', [
        'type' => 'note',
        'title' => 'Unfiled note',
    ])->assertRedirect();

    expect(session('capture')['url'])->toBe(route('documents'));
});
