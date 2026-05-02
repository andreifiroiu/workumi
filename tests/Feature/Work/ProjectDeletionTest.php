<?php

use App\Models\CommunicationThread;
use App\Models\Document;
use App\Models\Message;
use App\Models\Party;
use App\Models\Project;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderList;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->current_team_id = $this->team->id;
    $this->user->save();

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
});

it('deletes all work orders and their tasks when a project is deleted', function () {
    $project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $project->id,
    ]);
    Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $project->id,
    ]);

    $project->delete();

    expect(WorkOrder::withTrashed()->where('project_id', $project->id)->count())->toBe(1);
    expect(WorkOrder::where('project_id', $project->id)->count())->toBe(0);
    expect(Task::where('work_order_id', $workOrder->id)->count())->toBe(0);
});

it('deletes time entries through the cascade when a project is deleted', function () {
    $project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);
    $workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $project->id,
    ]);
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $project->id,
    ]);
    TimeEntry::factory()->count(3)->create(['task_id' => $task->id, 'team_id' => $this->team->id]);

    $project->delete();

    expect(TimeEntry::where('task_id', $task->id)->count())->toBe(0);
});

it('deletes work order lists when a project is deleted', function () {
    $project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);
    WorkOrderList::factory()->count(2)->create([
        'team_id' => $this->team->id,
        'project_id' => $project->id,
    ]);

    $project->delete();

    expect(WorkOrderList::where('project_id', $project->id)->count())->toBe(0);
});

it('deletes the communication thread and messages when a project is deleted', function () {
    $project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);
    $thread = CommunicationThread::factory()->forThreadable(Project::class, $project->id)->create([
        'team_id' => $this->team->id,
    ]);
    Message::factory()->count(2)->create(['communication_thread_id' => $thread->id]);

    $project->delete();

    expect(CommunicationThread::find($thread->id))->toBeNull();
    expect(Message::where('communication_thread_id', $thread->id)->count())->toBe(0);
});

it('force-deletes documents and removes files from storage when a project is deleted', function () {
    Storage::fake();

    $project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);
    $doc = Document::factory()->create([
        'team_id' => $this->team->id,
        'documentable_type' => Project::class,
        'documentable_id' => $project->id,
        'file_url' => 'documents/test/project.pdf',
    ]);
    Storage::put('documents/test/project.pdf', 'content');

    $project->delete();

    expect(Document::withTrashed()->find($doc->id))->toBeNull();
    Storage::assertMissing('documents/test/project.pdf');
});
