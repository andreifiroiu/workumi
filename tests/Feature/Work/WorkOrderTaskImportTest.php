<?php

use App\Enums\TaskStatus;
use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\UploadedFile;

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
    ]);
});

function importTasks(User $user, UploadedFile $file)
{
    return test()->actingAs($user)
        ->from('/work/work-orders/'.test()->workOrder->id)
        ->post('/work/work-orders/'.test()->workOrder->id.'/tasks/import', ['file' => $file]);
}

test('tasks are created from an uploaded markdown file', function () {
    $markdown = "- [x] **Draft wireframes** — Done · Ada · Due 2026-10-05\n\n  Cover mobile.\n\n  - [x] Desktop\n  - [ ] Mobile\n\n- Build hero section\n";

    importTasks($this->user, UploadedFile::fake()->createWithContent('tasks.md', $markdown))
        ->assertRedirect('/work/work-orders/'.$this->workOrder->id)
        ->assertSessionHasNoErrors();

    $tasks = $this->workOrder->tasks()->ordered()->get();

    expect($tasks)->toHaveCount(2);

    $first = $tasks[0];
    expect($first->title)->toBe('Draft wireframes')
        ->and($first->description)->toBe('Cover mobile.')
        ->and($first->status)->toBe(TaskStatus::Todo)
        ->and($first->assigned_to_id)->toBeNull()
        ->and($first->created_by_id)->toBe($this->user->id)
        ->and($first->project_id)->toBe($this->project->id)
        ->and($first->team_id)->toBe($this->team->id)
        ->and($first->due_date->format('Y-m-d'))->toBe('2026-10-05')
        ->and($first->checklist_items)->toHaveCount(2)
        ->and($first->checklist_items[0]['text'])->toBe('Desktop')
        ->and($first->checklist_items[0]['completed'])->toBeTrue()
        ->and($first->checklist_items[0]['id'])->toBeString()->not->toBeEmpty();

    expect($tasks[1]->title)->toBe('Build hero section')
        ->and($tasks[1]->due_date)->toBeNull();
});

test('a plain text file creates one task per line', function () {
    importTasks($this->user, UploadedFile::fake()->createWithContent('todo.txt', "Call the client\nSend the invoice\n"))
        ->assertSessionHasNoErrors();

    expect($this->workOrder->tasks()->ordered()->pluck('title')->all())
        ->toBe(['Call the client', 'Send the invoice']);
});

test('imported tasks are appended after existing ones', function () {
    Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
        'title' => 'Existing',
        'position_in_work_order' => 7,
    ]);

    importTasks($this->user, UploadedFile::fake()->createWithContent('tasks.md', "- New one\n- New two\n"));

    expect($this->workOrder->tasks()->ordered()->pluck('title')->all())
        ->toBe(['Existing', 'New one', 'New two']);
});

test('an exported file imports back into the same tasks', function () {
    Task::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'work_order_id' => $this->workOrder->id,
        'title' => 'Round trip',
        'description' => 'Keeps its description.',
        'due_date' => '2026-11-01',
        'checklist_items' => [['id' => 'a', 'text' => 'Step one', 'completed' => true]],
        'position_in_work_order' => 1,
    ]);

    $exported = $this->actingAs($this->user)
        ->get("/work/work-orders/{$this->workOrder->id}/tasks/export")
        ->streamedContent();

    $target = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);

    $this->actingAs($this->user)
        ->post("/work/work-orders/{$target->id}/tasks/import", [
            'file' => UploadedFile::fake()->createWithContent('export.md', $exported),
        ])
        ->assertSessionHasNoErrors();

    $imported = $target->tasks()->sole();

    expect($imported->title)->toBe('Round trip')
        ->and($imported->description)->toBe('Keeps its description.')
        ->and($imported->due_date->format('Y-m-d'))->toBe('2026-11-01')
        ->and($imported->checklist_items[0]['text'])->toBe('Step one')
        ->and($imported->checklist_items[0]['completed'])->toBeTrue();
});

test('files other than markdown or text are rejected', function () {
    importTasks($this->user, UploadedFile::fake()->createWithContent('tasks.csv', "a,b\n"))
        ->assertSessionHasErrors(['file' => 'Only .md and .txt files can be imported.']);

    expect($this->workOrder->tasks()->count())->toBe(0);
});

test('a file with no tasks reports an error', function () {
    importTasks($this->user, UploadedFile::fake()->createWithContent('empty.md', "# Just a heading\n"))
        ->assertSessionHasErrors(['file' => 'No tasks were found in that file.']);
});

test('non UTF-8 content is rejected', function () {
    importTasks($this->user, UploadedFile::fake()->createWithContent('latin1.txt', "Caf\xE9\n"))
        ->assertSessionHasErrors(['file' => 'The file must be UTF-8 encoded text.']);
});

test('users outside the team cannot import tasks', function () {
    $outsider = User::factory()->create();
    $outsiderTeam = $outsider->createTeam(['name' => 'Other Team']);
    $outsider->current_team_id = $outsiderTeam->id;
    $outsider->save();

    importTasks($outsider, UploadedFile::fake()->createWithContent('tasks.md', "- Sneaky\n"))
        ->assertForbidden();

    expect($this->workOrder->tasks()->count())->toBe(0);
});

test('the result of an import is flashed for the page to confirm', function () {
    importTasks($this->user, UploadedFile::fake()->createWithContent('tasks.md', "Intro\n\n- One\n- Two\n"))
        ->assertSessionHas('taskImport', ['imported' => 2, 'skipped' => 1]);
});

test('re-importing the export of an empty work order creates nothing', function () {
    $exported = $this->actingAs($this->user)
        ->get("/work/work-orders/{$this->workOrder->id}/tasks/export")
        ->streamedContent();

    importTasks($this->user, UploadedFile::fake()->createWithContent('export.md', $exported))
        ->assertSessionHasErrors(['file' => 'No tasks were found in that file.']);

    expect($this->workOrder->tasks()->count())->toBe(0);
});

test('a description too long for the column is rejected before anything is created', function () {
    $markdown = "- Short one\n- Long one\n\n  ".str_repeat('a', 65536)."\n";

    importTasks($this->user, UploadedFile::fake()->createWithContent('tasks.md', $markdown))
        ->assertSessionHasErrors(['file' => 'The description of "Long one" is longer than 64 KB.']);

    expect($this->workOrder->tasks()->count())->toBe(0);
});

test('a viewer can export but not import', function () {
    $viewer = addTeamMember($this->team, roleCode: 'viewer');

    $this->actingAs($viewer)
        ->get("/work/work-orders/{$this->workOrder->id}/tasks/export")
        ->assertOk();

    importTasks($viewer, UploadedFile::fake()->createWithContent('tasks.md', "- Sneaky\n"))
        ->assertForbidden();

    expect($this->workOrder->tasks()->count())->toBe(0);
});
