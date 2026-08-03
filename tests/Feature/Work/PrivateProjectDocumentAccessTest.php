<?php

use App\Models\Deliverable;
use App\Models\Document;
use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use App\Models\WorkOrder;

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->team = $this->owner->createTeam(['name' => 'Test Team']);
    $this->owner->forceFill(['current_team_id' => $this->team->id])->save();

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);

    $this->project = Project::factory()->private()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->owner->id,
        'accountable_id' => $this->owner->id,
        'consulted_ids' => [],
        'informed_ids' => [],
    ]);

    $this->workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->owner->id,
        'accountable_id' => $this->owner->id,
    ]);

    $this->outsider = addTeamMember($this->team);
});

function documentOn(string $type, int $id, int $teamId): Document
{
    return Document::factory()->create([
        'team_id' => $teamId,
        'documentable_type' => $type,
        'documentable_id' => $id,
    ]);
}

test('documents hanging off hidden work orders, tasks and deliverables stay hidden', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
    ]);

    $deliverable = Deliverable::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
    ]);

    $documents = [
        documentOn(WorkOrder::class, $this->workOrder->id, $this->team->id),
        documentOn(Task::class, $task->id, $this->team->id),
        documentOn(Deliverable::class, $deliverable->id, $this->team->id),
    ];

    foreach ($documents as $document) {
        expect($this->outsider->can('view', $document))->toBeFalse()
            ->and($this->outsider->can('update', $document))->toBeFalse();
    }
});

test('an explicit project member reaches those same documents', function () {
    $document = documentOn(WorkOrder::class, $this->workOrder->id, $this->team->id);

    $this->project->members()->attach($this->outsider, ['added_by_id' => $this->owner->id]);

    expect($this->outsider->can('view', $document->fresh()))->toBeTrue();
});

test('someone with a role on the work order reaches its documents without the project', function () {
    $this->workOrder->forceFill(['assigned_to_id' => $this->outsider->id])->save();

    $document = documentOn(WorkOrder::class, $this->workOrder->id, $this->team->id);

    expect($this->outsider->can('view', $document->fresh()))->toBeTrue()
        ->and($this->outsider->can('view', $this->project->fresh()))->toBeFalse();
});

test('documents in a non-private project stay team-wide', function () {
    $this->project->update(['is_private' => false]);

    $document = documentOn(WorkOrder::class, $this->workOrder->id, $this->team->id);

    expect($this->outsider->can('view', $document->fresh()))->toBeTrue();
});

test('team-level documents are unaffected', function () {
    $document = documentOn(Team::class, $this->team->id, $this->team->id);

    expect($this->outsider->can('view', $document->fresh()))->toBeTrue();
});
