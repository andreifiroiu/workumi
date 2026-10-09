<?php

use App\Enums\TaskStatus;
use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;

beforeEach(function () {
    $this->user = User::factory()->create(['name' => 'Ada Lovelace']);
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->current_team_id = $this->team->id;
    $this->user->save();

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
    $this->project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
        'name' => 'Website Relaunch',
    ]);
    $this->workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
        'title' => 'Homepage Redesign',
    ]);
});

function exportTask(array $attributes): Task
{
    return Task::factory()->create([
        'team_id' => test()->team->id,
        'project_id' => test()->project->id,
        'work_order_id' => test()->workOrder->id,
        'created_by_id' => test()->user->id,
        'assigned_to_id' => null,
        'assigned_agent_id' => null,
        'description' => null,
        'due_date' => null,
        'checklist_items' => [],
        ...$attributes,
    ]);
}

test('work order tasks are downloaded as a markdown file', function () {
    exportTask([
        'title' => 'Draft wireframes',
        'status' => TaskStatus::Done,
        'position_in_work_order' => 1,
        'assigned_to_id' => $this->user->id,
        'due_date' => '2026-10-05',
        'description' => "Cover desktop\nand mobile.",
        'checklist_items' => [
            ['id' => 'a', 'text' => 'Desktop', 'completed' => true],
            ['id' => 'b', 'text' => 'Mobile', 'completed' => false],
        ],
    ]);
    exportTask([
        'title' => 'Build hero section',
        'status' => TaskStatus::InProgress,
        'position_in_work_order' => 2,
    ]);

    $response = $this->actingAs($this->user)
        ->get("/work/work-orders/{$this->workOrder->id}/tasks/export");

    $response->assertOk();
    expect($response->headers->get('Content-Type'))->toContain('text/markdown');
    expect($response->headers->get('Content-Disposition'))->toContain('homepage-redesign-tasks.md');

    $expected = <<<'MD'
# Homepage Redesign

**Project:** Website Relaunch

## Tasks (2)

- [x] **Draft wireframes** — Done · Ada Lovelace · Due 2026-10-05

  Cover desktop
  and mobile.

  - [x] Desktop
  - [ ] Mobile

- [ ] **Build hero section** — In Progress

MD;

    expect($response->streamedContent())->toBe($expected);
});

test('archived tasks are left out of the export', function () {
    exportTask(['title' => 'Kept task', 'status' => TaskStatus::Todo]);
    exportTask(['title' => 'Archived task', 'status' => TaskStatus::Archived]);

    $content = $this->actingAs($this->user)
        ->get("/work/work-orders/{$this->workOrder->id}/tasks/export")
        ->streamedContent();

    expect($content)
        ->toContain('Kept task')
        ->toContain('## Tasks (1)')
        ->not->toContain('Archived task');
});

test('a work order without tasks exports a placeholder', function () {
    $content = $this->actingAs($this->user)
        ->get("/work/work-orders/{$this->workOrder->id}/tasks/export")
        ->streamedContent();

    expect($content)->toContain('_No tasks._');
});

test('users outside the team cannot export the tasks', function () {
    $outsider = User::factory()->create();
    $outsiderTeam = $outsider->createTeam(['name' => 'Other Team']);
    $outsider->current_team_id = $outsiderTeam->id;
    $outsider->save();

    $this->actingAs($outsider)
        ->get("/work/work-orders/{$this->workOrder->id}/tasks/export")
        ->assertForbidden();
});

test('line breaks in titles and checklist items are flattened so the list stays intact', function () {
    exportTask([
        'title' => "Two\nlines",
        'status' => TaskStatus::Todo,
        'checklist_items' => [['id' => 'a', 'text' => "Step\r\none", 'completed' => false]],
    ]);

    $content = $this->actingAs($this->user)
        ->get("/work/work-orders/{$this->workOrder->id}/tasks/export")
        ->streamedContent();

    expect($content)
        ->toContain('- [ ] **Two lines** — To Do')
        ->toContain('  - [ ] Step one');
});
