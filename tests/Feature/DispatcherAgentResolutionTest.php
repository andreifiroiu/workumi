<?php

declare(strict_types=1);

use App\Agents\DispatcherAgent;
use App\Models\AgentConfiguration;
use App\Models\AIAgent;
use App\Models\User;
use App\Services\AgentRunner;

test('the seeded dispatcher agent resolves to DispatcherAgent', function () {
    $owner = User::factory()->create();
    $team = $owner->createTeam(['name' => 'Resolve Team']);

    $agent = AIAgent::factory()->create(['code' => 'dispatcher', 'type' => 'work-routing']);
    $config = AgentConfiguration::create([
        'team_id' => $team->id,
        'ai_agent_id' => $agent->id,
        'ai_provider' => 'anthropic',
        'ai_model' => 'claude-sonnet-4-20250514',
        'enabled' => true,
    ]);

    $runner = app(AgentRunner::class);

    $method = new ReflectionMethod(AgentRunner::class, 'resolveAgentClass');
    $resolved = $method->invoke($runner, $agent);

    expect($resolved)->toBe(DispatcherAgent::class);
});
