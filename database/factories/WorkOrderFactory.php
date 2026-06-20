<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\Priority;
use App\Enums\WorkOrderStatus;
use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WorkOrder>
 */
class WorkOrderFactory extends Factory
{
    protected $model = WorkOrder::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $estimatedHours = fake()->numberBetween(4, 80);

        return [
            'team_id' => Team::factory(),
            'project_id' => Project::factory(),
            'assigned_to_id' => fake()->optional(0.8)->passthrough(User::factory()),
            'created_by_id' => User::factory(),
            'accountable_id' => fn (array $attributes) => $attributes['created_by_id'],
            'party_contact_id' => null,
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'status' => fake()->randomElement([
                WorkOrderStatus::Draft,
                WorkOrderStatus::Active,
                WorkOrderStatus::InReview,
                WorkOrderStatus::Approved,
                WorkOrderStatus::Delivered,
            ]),
            'priority' => fake()->randomElement(Priority::cases()),
            'due_date' => fake()->dateTimeBetween('now', '+3 months'),
            'estimated_hours' => $estimatedHours,
            'actual_hours' => fake()->numberBetween(0, $estimatedHours),
            'acceptance_criteria' => [
                fake()->sentence(),
                fake()->sentence(),
                fake()->sentence(),
            ],
            'sop_attached' => fake()->boolean(30),
            'sop_name' => null,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => WorkOrderStatus::Draft,
        ]);
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => WorkOrderStatus::Active,
        ]);
    }

    public function inReview(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => WorkOrderStatus::InReview,
        ]);
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => WorkOrderStatus::Approved,
        ]);
    }

    public function delivered(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => WorkOrderStatus::Delivered,
        ]);
    }

    public function blocked(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => WorkOrderStatus::Blocked,
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => WorkOrderStatus::Cancelled,
        ]);
    }

    public function revisionRequested(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => WorkOrderStatus::RevisionRequested,
        ]);
    }

    public function backlog(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => WorkOrderStatus::Backlog,
        ]);
    }

    public function highPriority(): static
    {
        return $this->state(fn (array $attributes) => [
            'priority' => Priority::High,
        ]);
    }

    public function urgent(): static
    {
        return $this->state(fn (array $attributes) => [
            'priority' => Priority::Urgent,
        ]);
    }
}
