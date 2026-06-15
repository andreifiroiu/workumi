<?php

use App\Enums\DocumentType;
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
    $this->project = Project::factory()->create([
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

test('user can create a markdown note on a work order', function () {
    $response = $this->actingAs($this->user)->post("/work/work-orders/{$this->workOrder->id}/notes", [
        'name' => 'Meeting notes',
        'content' => "# Heading\n\nSome **markdown** content.",
    ]);

    $response->assertRedirect();

    $document = Document::query()->latest('id')->first();

    expect($document)->not->toBeNull();
    expect($document->type)->toBe(DocumentType::Note);
    expect($document->name)->toBe('Meeting notes.md');
    expect($document->documentable_type)->toBe(WorkOrder::class);
    expect($document->documentable_id)->toBe($this->workOrder->id);

    Storage::disk('public')->assertExists("work-orders/{$this->workOrder->id}/notes/note-{$document->id}.md");
    expect(Storage::disk('public')->get("work-orders/{$this->workOrder->id}/notes/note-{$document->id}.md"))
        ->toBe("# Heading\n\nSome **markdown** content.");
});

test('note name keeps a single md extension', function () {
    $this->actingAs($this->user)->post("/work/work-orders/{$this->workOrder->id}/notes", [
        'name' => 'Already.md',
        'content' => 'x',
    ])->assertRedirect();

    expect(Document::query()->latest('id')->first()->name)->toBe('Already.md');
});

test('user can update a note name and content', function () {
    $this->actingAs($this->user)->post("/work/work-orders/{$this->workOrder->id}/notes", [
        'name' => 'Original',
        'content' => 'Original content',
    ]);

    $document = Document::query()->latest('id')->first();

    $response = $this->actingAs($this->user)->patch("/work/work-orders/{$this->workOrder->id}/notes/{$document->id}", [
        'name' => 'Renamed',
        'content' => 'Updated content',
    ]);

    $response->assertRedirect();

    $document->refresh();
    expect($document->name)->toBe('Renamed.md');
    expect(Storage::disk('public')->get("work-orders/{$this->workOrder->id}/notes/note-{$document->id}.md"))
        ->toBe('Updated content');
});

test('note content is returned when viewing the work order', function () {
    $this->actingAs($this->user)->post("/work/work-orders/{$this->workOrder->id}/notes", [
        'name' => 'Visible note',
        'content' => 'Readable content',
    ]);

    $this->actingAs($this->user)->get("/work/work-orders/{$this->workOrder->id}")
        ->assertInertia(fn ($page) => $page
            ->where('documents.0.type', 'note')
            ->where('documents.0.content', 'Readable content')
        );
});

test('user cannot update a note belonging to another work order', function () {
    $otherWorkOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);

    $this->actingAs($this->user)->post("/work/work-orders/{$this->workOrder->id}/notes", [
        'name' => 'A note',
        'content' => 'content',
    ]);

    $document = Document::query()->latest('id')->first();

    $this->actingAs($this->user)->patch("/work/work-orders/{$otherWorkOrder->id}/notes/{$document->id}", [
        'name' => 'Hijacked',
        'content' => 'nope',
    ])->assertForbidden();
});

test('creating a note requires a name', function () {
    $this->actingAs($this->user)->post("/work/work-orders/{$this->workOrder->id}/notes", [
        'content' => 'content without a name',
    ])->assertSessionHasErrors('name');
});
