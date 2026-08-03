<?php

declare(strict_types=1);

use App\Models\AuditLog;
use App\Models\Party;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->current_team_id = $this->team->id;
    $this->user->save();

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);

    // Create additional users for RACI testing
    $this->otherUser = User::factory()->create();
    $this->consulted1 = User::factory()->create();
    $this->consulted2 = User::factory()->create();
});

test('PATCH /projects/{id}/raci updates RACI fields', function () {
    $project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
        'accountable_id' => $this->user->id,
        'responsible_id' => null,
        'consulted_ids' => null,
        'informed_ids' => null,
    ]);

    // Use confirmed=true since we're changing accountable_id from user to otherUser
    $response = $this->actingAs($this->user)
        ->patchJson(route('projects.raci', $project), [
            'accountable_id' => $this->otherUser->id,
            'responsible_id' => $this->user->id,
            'consulted_ids' => [$this->consulted1->id, $this->consulted2->id],
            'informed_ids' => [$this->consulted1->id],
            'confirmed' => true,
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('confirmation_required', false)
        ->assertJsonPath('project.accountable_id', (string) $this->otherUser->id)
        ->assertJsonPath('project.responsible_id', (string) $this->user->id)
        ->assertJsonPath('project.consulted_ids', [(string) $this->consulted1->id, (string) $this->consulted2->id])
        ->assertJsonPath('project.informed_ids', [(string) $this->consulted1->id]);

    // Verify database
    $project->refresh();
    expect($project->accountable_id)->toBe($this->otherUser->id);
    expect($project->responsible_id)->toBe($this->user->id);
    expect($project->consulted_ids)->toBe([$this->consulted1->id, $this->consulted2->id]);
    expect($project->informed_ids)->toBe([$this->consulted1->id]);
});

test('PATCH /work-orders/{id}/raci updates RACI fields', function () {
    $project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
        'accountable_id' => $this->user->id,
    ]);

    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $project->id,
        'created_by_id' => $this->user->id,
        'accountable_id' => $this->user->id,
        'responsible_id' => null,
        'reviewer_id' => null,
        'consulted_ids' => null,
        'informed_ids' => null,
    ]);

    // Use confirmed=true since we're changing accountable_id from user to otherUser
    $response = $this->actingAs($this->user)
        ->patchJson(route('work-orders.raci', $workOrder), [
            'accountable_id' => $this->otherUser->id,
            'responsible_id' => $this->user->id,
            'reviewer_id' => $this->consulted1->id,
            'consulted_ids' => [$this->consulted1->id],
            'informed_ids' => [$this->consulted2->id],
            'confirmed' => true,
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('confirmation_required', false)
        ->assertJsonPath('work_order.accountable_id', (string) $this->otherUser->id)
        ->assertJsonPath('work_order.responsible_id', (string) $this->user->id)
        ->assertJsonPath('work_order.reviewer_id', (string) $this->consulted1->id)
        ->assertJsonPath('work_order.consulted_ids', [(string) $this->consulted1->id])
        ->assertJsonPath('work_order.informed_ids', [(string) $this->consulted2->id]);

    // Verify database
    $workOrder->refresh();
    expect($workOrder->accountable_id)->toBe($this->otherUser->id);
    expect($workOrder->responsible_id)->toBe($this->user->id);
    expect($workOrder->reviewer_id)->toBe($this->consulted1->id);
});

test('assignment change logs to AuditLog', function () {
    $project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
        'accountable_id' => $this->user->id,
        'responsible_id' => null,
    ]);

    // Use confirmed=true to ensure the update goes through (since accountable_id changes)
    $this->actingAs($this->user)
        ->patchJson(route('projects.raci', $project), [
            'accountable_id' => $this->otherUser->id,
            'responsible_id' => $this->consulted1->id,
            'confirmed' => true,
        ]);

    // Check audit log was created
    $auditLog = AuditLog::where('target', 'Project')
        ->where('target_id', (string) $project->id)
        ->where('action', 'raci_updated')
        ->first();

    expect($auditLog)->not->toBeNull();
    expect($auditLog->team_id)->toBe($this->team->id);
    expect($auditLog->actor_type)->toBe('user');
    expect($auditLog->actor_name)->toBe($this->user->name);
    expect($auditLog->details)->toContain('accountable_id');
    expect($auditLog->details)->toContain('responsible_id');
});

test('response includes confirmation_required when overwriting existing values', function () {
    $project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
        'accountable_id' => $this->user->id,
        'responsible_id' => $this->otherUser->id, // Already has a responsible
    ]);

    $response = $this->actingAs($this->user)
        ->patchJson(route('projects.raci', $project), [
            'accountable_id' => $this->otherUser->id,
            'responsible_id' => $this->consulted1->id, // Changing responsible
            'confirmed' => false, // Not confirmed
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('confirmation_required', true)
        ->assertJsonStructure([
            'confirmation_required',
            'message',
            'changes' => [
                '*' => ['field', 'from', 'to'],
            ],
        ]);

    // Verify database was NOT updated
    $project->refresh();
    expect($project->responsible_id)->toBe($this->otherUser->id);
});

test('confirmed request updates existing values', function () {
    $project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
        'accountable_id' => $this->user->id,
        'responsible_id' => $this->otherUser->id,
    ]);

    $response = $this->actingAs($this->user)
        ->patchJson(route('projects.raci', $project), [
            'accountable_id' => $this->consulted1->id,
            'responsible_id' => $this->consulted2->id,
            'confirmed' => true, // Confirmed
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('confirmation_required', false)
        ->assertJsonPath('project.accountable_id', (string) $this->consulted1->id)
        ->assertJsonPath('project.responsible_id', (string) $this->consulted2->id);

    // Verify database was updated
    $project->refresh();
    expect($project->accountable_id)->toBe($this->consulted1->id);
    expect($project->responsible_id)->toBe($this->consulted2->id);
});

test('a null responsible_id clears an existing work order assignment', function () {
    $project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
        'accountable_id' => $this->user->id,
    ]);

    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $project->id,
        'created_by_id' => $this->user->id,
        'accountable_id' => $this->user->id,
        'responsible_id' => $this->otherUser->id,
        'consulted_ids' => [$this->consulted1->id],
    ]);

    $response = $this->actingAs($this->user)
        ->patchJson(route('work-orders.raci', $workOrder), [
            'accountable_id' => $this->user->id,
            'responsible_id' => null,
            'consulted_ids' => [],
            'informed_ids' => [],
            'confirmed' => true,
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('confirmation_required', false)
        ->assertJsonPath('work_order.responsible_id', null);

    $workOrder->refresh();
    expect($workOrder->responsible_id)->toBeNull();
    expect($workOrder->consulted_ids)->toBe([]);
    expect($workOrder->accountable_id)->toBe($this->user->id);
});
