<?php

use App\Models\CommunicationThread;
use App\Models\Deliverable;
use App\Models\Document;
use App\Models\Message;
use App\Models\StatusTransition;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->current_team_id = $this->team->id;
    $this->user->save();
});

it('deletes all tasks and their time entries when a work order is deleted', function () {
    $workOrder = WorkOrder::factory()->create(['team_id' => $this->team->id]);
    $task = Task::factory()->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $workOrder->project_id,
    ]);
    TimeEntry::factory()->count(2)->create(['task_id' => $task->id, 'team_id' => $this->team->id]);

    $workOrder->delete();

    expect(Task::withTrashed()->where('work_order_id', $workOrder->id)->count())->toBe(1);
    expect(Task::where('work_order_id', $workOrder->id)->count())->toBe(0);
    expect(TimeEntry::where('task_id', $task->id)->count())->toBe(0);
});

it('deletes deliverables when a work order is deleted', function () {
    $workOrder = WorkOrder::factory()->create(['team_id' => $this->team->id]);
    Deliverable::factory()->count(2)->create([
        'team_id' => $this->team->id,
        'work_order_id' => $workOrder->id,
        'project_id' => $workOrder->project_id,
    ]);

    $workOrder->delete();

    expect(Deliverable::where('work_order_id', $workOrder->id)->count())->toBe(0);
});

it('deletes status transitions when a work order is deleted', function () {
    $workOrder = WorkOrder::factory()->create(['team_id' => $this->team->id]);
    StatusTransition::create([
        'transitionable_type' => WorkOrder::class,
        'transitionable_id' => $workOrder->id,
        'user_id' => $this->user->id,
        'action_type' => 'status_change',
        'created_at' => now(),
    ]);

    $workOrder->delete();

    expect(StatusTransition::where('transitionable_type', WorkOrder::class)
        ->where('transitionable_id', $workOrder->id)
        ->count()
    )->toBe(0);
});

it('deletes the communication thread and messages when a work order is deleted', function () {
    $workOrder = WorkOrder::factory()->create(['team_id' => $this->team->id]);
    $thread = CommunicationThread::factory()->forThreadable(WorkOrder::class, $workOrder->id)->create([
        'team_id' => $this->team->id,
    ]);
    Message::factory()->count(3)->create(['communication_thread_id' => $thread->id]);

    $workOrder->delete();

    expect(CommunicationThread::find($thread->id))->toBeNull();
    expect(Message::where('communication_thread_id', $thread->id)->count())->toBe(0);
});

it('force-deletes documents and removes files from storage when a work order is deleted', function () {
    Storage::fake();

    $workOrder = WorkOrder::factory()->create(['team_id' => $this->team->id]);
    $doc = Document::factory()->create([
        'team_id' => $this->team->id,
        'documentable_type' => WorkOrder::class,
        'documentable_id' => $workOrder->id,
        'file_url' => 'documents/test/workorder.pdf',
    ]);
    Storage::put('documents/test/workorder.pdf', 'content');

    $workOrder->delete();

    expect(Document::withTrashed()->find($doc->id))->toBeNull();
    Storage::assertMissing('documents/test/workorder.pdf');
});
