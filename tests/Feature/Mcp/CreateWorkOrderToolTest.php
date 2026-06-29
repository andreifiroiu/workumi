<?php

declare(strict_types=1);

use App\Models\OAuthUser;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Testing\TestResponse;
use Laravel\Passport\Passport;

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->team = $this->owner->createTeam(['name' => 'Test Team']);
    $this->owner->current_team_id = $this->team->id;
    $this->owner->save();

    $this->project = Project::factory()->create(['team_id' => $this->team->id]);
});

function callCreateWorkOrder(array $arguments): TestResponse
{
    return test()->postJson('/mcp', [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'tools/call',
        'params' => [
            'name' => 'create-work-order-tool',
            'arguments' => $arguments,
        ],
    ]);
}

test('create work order tool persists the work order with the authenticated user as creator', function () {
    Passport::actingAs(OAuthUser::findOrFail($this->owner->id), ['mcp:use']);

    $response = callCreateWorkOrder([
        'project_id' => $this->project->id,
        'title' => 'Delete action for Recurrent Invoices',
        'description' => 'Add a delete action for recurrent invoices.',
        'priority' => 'low',
    ]);

    $response->assertOk()->assertJsonMissingPath('error');

    $workOrder = WorkOrder::firstWhere('title', 'Delete action for Recurrent Invoices');

    expect($workOrder)->not->toBeNull()
        ->and($workOrder->team_id)->toBe($this->team->id)
        ->and($workOrder->project_id)->toBe($this->project->id)
        ->and($workOrder->created_by_id)->toBe($this->owner->id)
        ->and($workOrder->accountable_id)->toBe($this->owner->id);
});
