<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\AgentConfiguration;
use App\Models\AIAgent;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AgentConfiguration>
 */
class AgentConfigurationFactory extends Factory
{
    protected $model = AgentConfiguration::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'ai_agent_id' => AIAgent::factory(),
            'enabled' => false,
        ];
    }

    /**
     * An agent a team can actually be assigned work on — the enabled flag is what
     * every "available to this team" query filters on.
     */
    public function enabled(): static
    {
        return $this->state(fn () => ['enabled' => true]);
    }
}
