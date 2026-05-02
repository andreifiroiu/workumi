<?php

use App\Models\CommunicationThread;
use App\Models\Document;
use App\Models\Message;
use App\Models\StatusTransition;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->current_team_id = $this->team->id;
    $this->user->save();
});

it('deletes time entries when a task is deleted', function () {
    $task = Task::factory()->create(['team_id' => $this->team->id]);
    TimeEntry::factory()->count(3)->create(['task_id' => $task->id, 'team_id' => $this->team->id]);

    $task->delete();

    expect(TimeEntry::where('task_id', $task->id)->count())->toBe(0);
});

it('deletes status transitions when a task is deleted', function () {
    $task = Task::factory()->create(['team_id' => $this->team->id]);
    StatusTransition::create([
        'transitionable_type' => Task::class,
        'transitionable_id' => $task->id,
        'user_id' => $this->user->id,
        'action_type' => 'status_change',
        'created_at' => now(),
    ]);

    $task->delete();

    expect(StatusTransition::where('transitionable_type', Task::class)
        ->where('transitionable_id', $task->id)
        ->count()
    )->toBe(0);
});

it('deletes the communication thread and messages when a task is deleted', function () {
    $task = Task::factory()->create(['team_id' => $this->team->id]);
    $thread = CommunicationThread::factory()->forThreadable(Task::class, $task->id)->create([
        'team_id' => $this->team->id,
    ]);
    Message::factory()->count(2)->create(['communication_thread_id' => $thread->id]);

    $task->delete();

    expect(CommunicationThread::find($thread->id))->toBeNull();
    expect(Message::where('communication_thread_id', $thread->id)->count())->toBe(0);
});

it('force-deletes documents and removes files from storage when a task is deleted', function () {
    Storage::fake();

    $task = Task::factory()->create(['team_id' => $this->team->id]);
    $doc = Document::factory()->create([
        'team_id' => $this->team->id,
        'documentable_type' => Task::class,
        'documentable_id' => $task->id,
        'file_url' => 'documents/test/file.pdf',
    ]);
    Storage::put('documents/test/file.pdf', 'content');

    $task->delete();

    expect(Document::withTrashed()->find($doc->id))->toBeNull();
    Storage::assertMissing('documents/test/file.pdf');
});
