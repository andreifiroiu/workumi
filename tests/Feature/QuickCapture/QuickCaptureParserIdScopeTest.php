<?php

use App\Enums\CaptureType;
use App\Models\Party;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\AI\LLMResponse;
use App\Services\AI\LLMService;
use App\Services\QuickCaptureParser;

/**
 * Everything the model returns is untrusted input. These cover the branch that
 * keeps a hallucinated or cross-team id from reaching the capture form.
 */
beforeEach(function () {
    $this->user = User::factory()->create();
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->current_team_id = $this->team->id;
    $this->user->save();

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
    // Pinned: the factory randomises status across every case including
    // archived, which capture options and the parser both filter out.
    $this->project = Project::factory()->active()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
    ]);
    $this->workOrder = WorkOrder::factory()->create([
        'team_id' => $this->team->id,
        'project_id' => $this->project->id,
        'created_by_id' => $this->user->id,
    ]);
});

/**
 * @param  array<string, mixed>  $payload
 */
function parserReturning(array $payload): QuickCaptureParser
{
    $llm = Mockery::mock(LLMService::class);
    $llm->shouldReceive('complete')->andReturn(
        new LLMResponse(content: json_encode($payload))
    );

    return new QuickCaptureParser($llm);
}

test('a work order id from another team is discarded', function () {
    $otherUser = User::factory()->create();
    $otherTeam = $otherUser->createTeam(['name' => 'Other Team']);
    $otherParty = Party::factory()->create(['team_id' => $otherTeam->id]);
    $otherProject = Project::factory()->active()->create([
        'team_id' => $otherTeam->id,
        'party_id' => $otherParty->id,
        'owner_id' => $otherUser->id,
    ]);
    $otherWorkOrder = WorkOrder::factory()->create([
        'team_id' => $otherTeam->id,
        'project_id' => $otherProject->id,
        'created_by_id' => $otherUser->id,
    ]);

    $parser = parserReturning([
        'type' => 'task',
        'title' => 'Leaky task',
        'workOrderId' => $otherWorkOrder->id,
        'confidence' => 'high',
    ]);

    $proposal = $parser->parse('anything', $this->user, (int) $this->team->id);

    expect($proposal->workOrderId)->toBeNull();
    // With no usable work order a task could not be submitted, so it is
    // downgraded rather than offered as something that will fail on Create.
    expect($proposal->type)->not->toBe(CaptureType::Task);
});

test('an invented work order id is discarded', function () {
    $parser = parserReturning([
        'type' => 'task',
        'title' => 'Imaginary task',
        'workOrderId' => 999999,
    ]);

    $proposal = $parser->parse('anything', $this->user, (int) $this->team->id);

    expect($proposal->workOrderId)->toBeNull();
});

test('a work order id from the same team is kept', function () {
    $parser = parserReturning([
        'type' => 'task',
        'title' => 'Real task',
        'workOrderId' => $this->workOrder->id,
        'dueDate' => '2026-10-01',
        'priority' => 'HIGH',
        'confidence' => 'high',
    ]);

    $proposal = $parser->parse('anything', $this->user, (int) $this->team->id);

    expect($proposal->type)->toBe(CaptureType::Task);
    expect($proposal->workOrderId)->toBe((int) $this->workOrder->id);
    expect($proposal->title)->toBe('Real task');
    expect($proposal->dueDate)->toBe('2026-10-01');
    expect($proposal->priority)->toBe('high');
});

test('an unparseable due date is dropped rather than failing the parse', function () {
    $parser = parserReturning([
        'type' => 'task',
        'title' => 'Vague task',
        'workOrderId' => $this->workOrder->id,
        'dueDate' => 'whenever',
    ]);

    $proposal = $parser->parse('anything', $this->user, (int) $this->team->id);

    expect($proposal->dueDate)->toBeNull();
    expect($proposal->title)->toBe('Vague task');
});

test('json wrapped in a markdown fence is still read', function () {
    $llm = Mockery::mock(LLMService::class);
    $llm->shouldReceive('complete')->andReturn(new LLMResponse(
        content: "```json\n".json_encode([
            'type' => 'note',
            'title' => 'Fenced note',
        ])."\n```"
    ));

    $proposal = (new QuickCaptureParser($llm))->parse('anything', $this->user, (int) $this->team->id);

    expect($proposal->title)->toBe('Fenced note');
    expect($proposal->type)->toBe(CaptureType::Note);
});
