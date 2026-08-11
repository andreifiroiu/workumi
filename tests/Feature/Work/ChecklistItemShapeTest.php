<?php

declare(strict_types=1);

use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->forceFill(['current_team_id' => $this->team->id])->save();

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

test('a checklist item created through the API can be toggled from the web app', function () {
    // The API validates `text` but never assigned an `id`, and every checklist
    // endpoint matches on it — so items created this way used to be untoggleable.
    $token = $this->user->createToken('api')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/tasks', [
            'work_order_id' => $this->workOrder->id,
            'title' => 'API Task',
            'checklist_items' => [['text' => 'Written by the API']],
        ])
        ->assertCreated();

    $task = Task::findOrFail($response->json('data.id'));
    $itemId = $task->checklist_items[0]['id'];

    expect($itemId)->toBeString()->not->toBeEmpty();

    $this->actingAs($this->user)
        ->patch("/work/tasks/{$task->id}/checklist/{$itemId}", ['completed' => true])
        ->assertRedirect();

    expect($task->fresh()->checklist_items[0]['completed'])->toBeTrue();
});

test('checklist items are stored in the canonical shape whichever surface writes them', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
        'checklist_items' => ['A bare string', ['text' => 'An object with no id']],
    ]);

    foreach ($task->fresh()->checklist_items as $item) {
        expect($item)->toHaveKeys(['id', 'text', 'completed'])
            ->and($item['id'])->toBeString()->not->toBeEmpty()
            ->and($item['completed'])->toBeBool();
    }
});

test('updating a task normalizes its checklist items too', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
    ]);

    $this->actingAs($this->user)
        ->patch("/work/tasks/{$task->id}", [
            'checklistItems' => [['text' => 'Added on update']],
        ])
        ->assertRedirect();

    $item = $task->fresh()->checklist_items[0];

    expect($item['id'])->toBeString()->not->toBeEmpty()
        ->and($item['text'])->toBe('Added on update')
        ->and($item['completed'])->toBeFalse();
});

test('creating a task rejects checklist items that are neither text nor an object with text', function () {
    $this->actingAs($this->user)->post('/work/tasks', [
        'title' => 'Junk Checklist',
        'workOrderId' => $this->workOrder->id,
        'dueDate' => '2026-01-15',
        'checklistItems' => [['nope' => 1]],
    ])->assertSessionHasErrors('checklistItems.0');

    $this->assertDatabaseMissing('tasks', ['title' => 'Junk Checklist']);
});

test('updating a task rejects checklist items that are neither text nor an object with text', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
        'checklist_items' => [['id' => 'keep', 'text' => 'Existing', 'completed' => false]],
    ]);

    $this->actingAs($this->user)
        ->patch("/work/tasks/{$task->id}", ['checklistItems' => [['text' => 'fine'], 42]])
        ->assertSessionHasErrors('checklistItems.1');

    expect($task->fresh()->checklist_items)->toHaveCount(1)
        ->and($task->fresh()->checklist_items[0]['text'])->toBe('Existing');
});

test('checklist endpoints report an unknown item id instead of reporting success', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
        'checklist_items' => [['id' => 'real', 'text' => 'Real item', 'completed' => false]],
    ]);

    $this->actingAs($this->user)
        ->patch("/work/tasks/{$task->id}/checklist/nope", ['completed' => true])
        ->assertNotFound();

    $this->actingAs($this->user)
        ->patch("/work/tasks/{$task->id}/checklist/nope/text", ['text' => 'Renamed'])
        ->assertNotFound();

    $this->actingAs($this->user)
        ->delete("/work/tasks/{$task->id}/checklist/nope")
        ->assertNotFound();

    expect($task->fresh()->checklist_items)->toHaveCount(1);
});

test('the backfill repairs checklist items that predate normalization', function () {
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
    ]);

    // Write past the mutator, exactly as the API used to.
    DB::table('tasks')->where('id', $task->id)->update([
        'checklist_items' => json_encode([['text' => 'Legacy item', 'completed' => false]]),
    ]);

    $migration = require database_path('migrations/2026_08_11_120000_backfill_checklist_item_ids.php');
    $migration->up();

    $item = $task->fresh()->checklist_items[0];

    expect($item['id'])->toBeString()->not->toBeEmpty()
        ->and($item['text'])->toBe('Legacy item');

    $this->actingAs($this->user)
        ->patch("/work/tasks/{$task->id}/checklist/{$item['id']}", ['completed' => true])
        ->assertRedirect();

    expect($task->fresh()->checklist_items[0]['completed'])->toBeTrue();
});

test('creating a task accepts checklist items as bare strings', function () {
    // Playbooks and AI suggestions emit this shape.
    $this->actingAs($this->user)->post('/work/tasks', [
        'title' => 'String Checklist',
        'workOrderId' => $this->workOrder->id,
        'dueDate' => '2026-01-15',
        'checklistItems' => ['First step', 'Second step'],
    ])->assertRedirect();

    $task = Task::where('title', 'String Checklist')->firstOrFail();

    expect($task->checklist_items)->toHaveCount(2)
        ->and($task->checklist_items[0]['text'])->toBe('First step')
        ->and($task->checklist_items[0]['id'])->toBeString()->not->toBeEmpty();
});
