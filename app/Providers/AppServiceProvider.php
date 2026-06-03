<?php

namespace App\Providers;

use App\Events\DeliverableStatusChanged;
use App\Events\MessageCreated;
use App\Events\TaskStatusChanged;
use App\Events\WorkOrderCreated;
use App\Events\WorkOrderStatusChanged;
use App\Listeners\AgentTriggerListener;
use App\Listeners\DeliverableStatusChangedListener;
use App\Listeners\DispatcherMentionListener;
use App\Listeners\TriggerPMCopilotOnWorkOrderCreated;
use App\Listeners\WorkOrderStatusChangedListener;
use App\Models\Document;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\TimeEntry;
use App\Models\WorkOrder;
use App\Observers\DocumentObserver;
use App\Observers\ProjectObserver;
use App\Observers\TaskObserver;
use App\Observers\TeamObserver;
use App\Observers\TimeEntryObserver;
use App\Observers\WorkOrderObserver;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register model observers
        Team::observe(TeamObserver::class);
        TimeEntry::observe(TimeEntryObserver::class);
        Project::observe(ProjectObserver::class);
        WorkOrder::observe(WorkOrderObserver::class);
        Task::observe(TaskObserver::class);
        Document::observe(DocumentObserver::class);

        // Register event listeners
        Event::listen(MessageCreated::class, DispatcherMentionListener::class);
        Event::listen(WorkOrderCreated::class, TriggerPMCopilotOnWorkOrderCreated::class);
        Event::listen(WorkOrderStatusChanged::class, WorkOrderStatusChangedListener::class);
        Event::listen(DeliverableStatusChanged::class, DeliverableStatusChangedListener::class);

        // Register AgentTriggerListener for status change events (agent chain triggers)
        Event::listen(WorkOrderStatusChanged::class, [AgentTriggerListener::class, 'handleWorkOrderStatusChanged']);
        Event::listen(DeliverableStatusChanged::class, [AgentTriggerListener::class, 'handleDeliverableStatusChanged']);
        Event::listen(TaskStatusChanged::class, [AgentTriggerListener::class, 'handleTaskStatusChanged']);
    }
}
