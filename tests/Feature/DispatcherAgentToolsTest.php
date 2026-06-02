<?php

declare(strict_types=1);

use App\Agents\DispatcherAgent;
use App\Models\AgentConfiguration;
use App\Models\AIAgent;
use App\Models\User;
use App\Services\AgentBudgetService;
use App\Services\ToolGateway;

/**
 * Guards the fix for the double-creation defect: the Dispatcher Agent must be a
 * read-only analyzer. If it ever regains write tools, the inbound job would both
 * create entities during the chat tool-loop AND re-create them from JSON, and the
 * confidence gate would be bypassed.
 */
test('the dispatcher agent exposes only read-only tools', function () {
    $owner = User::factory()->create();
    $team = $owner->createTeam(['name' => 'Tools Team']);

    $agent = AIAgent::factory()->create(['code' => 'dispatcher', 'type' => 'work-routing']);
    $config = AgentConfiguration::create([
        'team_id' => $team->id,
        'ai_agent_id' => $agent->id,
        'ai_provider' => 'anthropic',
        'ai_model' => 'claude-sonnet-4-20250514',
        'enabled' => true,
        // Grant every write permission to prove the read-only filter, not the
        // permission gate, is what keeps write tools out.
        'can_create_work_orders' => true,
        'can_modify_tasks' => true,
        'can_modify_deliverables' => true,
    ]);

    $dispatcher = new DispatcherAgent(
        $agent,
        $config,
        app(ToolGateway::class),
        app(AgentBudgetService::class),
    );

    $tools = $dispatcher->getLaboTools();

    // No mutating tool (by naming convention) may be exposed to the dispatcher.
    foreach ($tools as $tool) {
        expect($tool->name())->not->toMatch('/^(create|update|delete)-/');
    }

    $toolNames = array_map(fn ($tool) => $tool->name(), $tools);
    expect($toolNames)
        ->not->toContain('create-project')
        ->not->toContain('create-draft-work-order')
        ->not->toContain('create-task')
        ->not->toContain('create-note')
        ->not->toContain('create-deliverable');
});
