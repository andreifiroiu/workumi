<?php

declare(strict_types=1);

use App\Enums\AIConfidence;
use App\Enums\InboxItemType;
use App\Jobs\ProcessInboundEmail;
use App\Models\AgentActivityLog;
use App\Models\AgentConfiguration;
use App\Models\AIAgent;
use App\Models\GlobalAISettings;
use App\Models\InboxItem;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\AgentRunner;

beforeEach(function () {
    $this->owner = User::factory()->create(['email' => 'requester@example.com']);
    $this->team = $this->owner->createTeam(['name' => 'Inbound Team']);
    $this->owner->current_team_id = $this->team->id;
    $this->owner->save();

    GlobalAISettings::forTeam($this->team)->update(['inbound_email_enabled' => true]);

    $this->agent = AIAgent::factory()->create(['code' => 'dispatcher', 'type' => 'work-routing']);

    AgentConfiguration::create([
        'team_id' => $this->team->id,
        'ai_agent_id' => $this->agent->id,
        'ai_provider' => 'anthropic',
        'ai_model' => 'claude-sonnet-4-20250514',
        'enabled' => true,
        'can_create_work_orders' => true,
        'can_modify_tasks' => true,
    ]);
});

/**
 * Bind a fake AgentRunner that returns deterministic JSON output.
 */
function fakeDispatcherOutput(string $json): void
{
    test()->mock(AgentRunner::class, function ($mock) use ($json) {
        $mock->shouldReceive('runWithPrompt')->andReturn(new AgentActivityLog(['output' => $json]));
    });
}

function inboundEmail(): array
{
    return [
        'from' => 'requester@example.com',
        'subject' => 'New work',
        'body' => 'Please handle this.',
        'message_id' => '<msg@example.com>',
    ];
}

test('ignores email from an unknown sender', function () {
    fakeDispatcherOutput('{"entities":[{"kind":"work_order","title":"X","confidence":"high"}]}');

    ProcessInboundEmail::dispatchSync(array_merge(inboundEmail(), ['from' => 'stranger@example.com']));

    expect(WorkOrder::count())->toBe(0)
        ->and(InboxItem::count())->toBe(0);
});

test('high confidence work order is created live without an approval item', function () {
    fakeDispatcherOutput('{"entities":[{"kind":"work_order","title":"Build landing page","description":"d","priority":"high","confidence":"high"}]}');

    ProcessInboundEmail::dispatchSync(inboundEmail());

    expect(WorkOrder::where('title', 'Build landing page')->exists())->toBeTrue()
        ->and(InboxItem::where('type', InboxItemType::Approval)->count())->toBe(0);
});

test('medium confidence work order creates a draft plus an approval inbox item', function () {
    fakeDispatcherOutput('{"entities":[{"kind":"work_order","title":"Maybe build something","confidence":"medium"}]}');

    ProcessInboundEmail::dispatchSync(inboundEmail());

    $workOrder = WorkOrder::where('title', 'Maybe build something')->first();
    expect($workOrder)->not->toBeNull();

    $item = InboxItem::where('type', InboxItemType::Approval)->first();
    expect($item)->not->toBeNull()
        ->and($item->ai_confidence)->toBe(AIConfidence::Medium)
        ->and($item->approvable_id)->toBe($workOrder->id)
        ->and($item->related_work_order_id)->toBe($workOrder->id);
});

test('high confidence task is created live under a work order', function () {
    fakeDispatcherOutput('{"entities":[{"kind":"task","title":"Send invoice","confidence":"high"}]}');

    ProcessInboundEmail::dispatchSync(inboundEmail());

    expect(Task::where('title', 'Send invoice')->exists())->toBeTrue()
        ->and(InboxItem::where('type', InboxItemType::Approval)->count())->toBe(0);
});

test('flags for manual triage when inbound email is disabled', function () {
    GlobalAISettings::forTeam($this->team)->update(['inbound_email_enabled' => false]);
    fakeDispatcherOutput('{"entities":[{"kind":"work_order","title":"X","confidence":"high"}]}');

    ProcessInboundEmail::dispatchSync(inboundEmail());

    expect(InboxItem::where('type', InboxItemType::Flag)->count())->toBe(1)
        ->and(WorkOrder::count())->toBe(0);
});

test('does not create entities twice for a duplicate message id', function () {
    fakeDispatcherOutput('{"entities":[{"kind":"work_order","title":"Build landing page","confidence":"high"}]}');

    ProcessInboundEmail::dispatchSync(inboundEmail());
    ProcessInboundEmail::dispatchSync(inboundEmail());

    expect(WorkOrder::where('title', 'Build landing page')->count())->toBe(1);
});

test('flags for manual triage when a tool fails (missing permission)', function () {
    // Revoke the create permission so the tool execution is denied.
    AgentConfiguration::where('team_id', $this->team->id)->update(['can_create_work_orders' => false]);
    fakeDispatcherOutput('{"entities":[{"kind":"work_order","title":"Build landing page","confidence":"high"}]}');

    ProcessInboundEmail::dispatchSync(inboundEmail());

    expect(WorkOrder::where('title', 'Build landing page')->exists())->toBeFalse()
        ->and(InboxItem::where('type', InboxItemType::Flag)->count())->toBeGreaterThan(0);
});
