<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ProjectStatus;
use App\Models\Party;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    protected $model = Project::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startDate = fake()->dateTimeBetween('-3 months', 'now');
        $budgetHours = fake()->optional(0.8)->numberBetween(40, 500);

        return [
            'team_id' => Team::factory(),
            'party_id' => Party::factory(),
            'owner_id' => User::factory(),
            'accountable_id' => fn (array $attributes) => $attributes['owner_id'],
            'name' => fake()->catchPhrase(),
            'description' => fake()->paragraph(),
            'status' => fake()->randomElement(ProjectStatus::cases()),
            'start_date' => $startDate,
            'target_end_date' => fake()->optional(0.8)->dateTimeBetween($startDate, '+6 months'),
            'budget_hours' => $budgetHours,
            'actual_hours' => $budgetHours ? fake()->numberBetween(0, $budgetHours) : fake()->numberBetween(0, 100),
            'progress' => fake()->numberBetween(0, 100),
            'tags' => fake()->randomElements(['design', 'development', 'marketing', 'branding', 'web', 'content', 'social'], fake()->numberBetween(1, 3)),
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ProjectStatus::Active,
        ]);
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ProjectStatus::Archived,
            'progress' => 100,
        ]);
    }

    public function onHold(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ProjectStatus::OnHold,
        ]);
    }

    public function private(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_private' => true,
        ]);
    }
}
