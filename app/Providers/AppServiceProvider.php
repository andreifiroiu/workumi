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
use App\Models\User;
use App\Models\WorkOrder;
use App\Observers\DocumentObserver;
use App\Observers\ProjectObserver;
use App\Observers\TaskObserver;
use App\Observers\TeamObserver;
use App\Observers\TimeEntryObserver;
use App\Observers\WorkOrderObserver;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Laravel\Passport\Passport;

// use OpenTelemetry\API\Globals;
// use OpenTelemetry\API\Logs\LoggerProviderInterface;
// use OpenTelemetry\API\Metrics\MeterProviderInterface;
// use OpenTelemetry\API\Trace\TracerProviderInterface;
// use OpenTelemetry\Contrib\Otlp\LogsExporter;
// use OpenTelemetry\Contrib\Otlp\MetricExporter;
// use OpenTelemetry\Contrib\Otlp\SpanExporter;
// use OpenTelemetry\SDK\Common\Attribute\Attributes;
// use OpenTelemetry\SDK\Common\Export\Http\PsrTransportFactory;
// use OpenTelemetry\SDK\Common\Time\ClockFactory;
// use OpenTelemetry\SDK\Logs\LoggerProvider;
// use OpenTelemetry\SDK\Logs\Processor\BatchLogRecordProcessor;
// use OpenTelemetry\SDK\Metrics\MeterProvider;
// use OpenTelemetry\SDK\Metrics\MetricReader\ExportingReader;
// use OpenTelemetry\SDK\Resource\ResourceInfo;
// use OpenTelemetry\SDK\Trace\Sampler\AlwaysOnSampler;
// use OpenTelemetry\SDK\Trace\Sampler\ParentBased;
// use OpenTelemetry\SDK\Trace\SpanProcessor\BatchSpanProcessor;
// use OpenTelemetry\SDK\Trace\TracerProvider;
// use OpenTelemetry\SemConv\Attributes\ServiceAttributes;
// use OpenTelemetry\SemConv\Incubating\Attributes\DeploymentIncubatingAttributes;
// use OpenTelemetry\SemConv\Incubating\Attributes\ServiceIncubatingAttributes;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Display Laravel MCP's authorization consent screen during the OAuth flow.
        Passport::authorizationView(fn ($parameters) => view('mcp.authorize', $parameters));

        // Authorize access to Log Viewer (opcodesio/log-viewer) in production.
        Gate::define('viewLogViewer', function (?User $user): bool {
            return $user !== null
                && in_array($user->email, config('log-viewer.allowed_emails', []), true);
        });

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
