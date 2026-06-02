<?php

declare(strict_types=1);

use App\Agents\Tools\CreateProjectTool;
use App\Enums\ProjectStatus;
use App\Models\Party;
use App\Models\Project;
use App\Models\User;

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->team = $this->owner->createTeam(['name' => 'Tool Team']);
});

test('creates a project resolving an internal party when none provided', function () {
    $tool = new CreateProjectTool;

    $result = $tool->execute([
        'team_id' => $this->team->id,
        'name' => 'Website Redesign',
        'owner_id' => $this->owner->id,
    ]);

    expect($result['success'])->toBeTrue();

    $project = Project::find($result['project']['id']);
    expect($project)->not->toBeNull()
        ->and($project->status)->toBe(ProjectStatus::Active)
        ->and($project->start_date)->not->toBeNull()
        ->and($project->owner_id)->toBe($this->owner->id);

    $party = Party::find($project->party_id);
    expect($party->name)->toBe('Internal')
        ->and($party->team_id)->toBe($this->team->id);
});

test('reuses the same internal party across projects', function () {
    $tool = new CreateProjectTool;

    $first = $tool->execute(['team_id' => $this->team->id, 'name' => 'A', 'owner_id' => $this->owner->id]);
    $second = $tool->execute(['team_id' => $this->team->id, 'name' => 'B', 'owner_id' => $this->owner->id]);

    expect(Project::find($first['project']['id'])->party_id)
        ->toBe(Project::find($second['project']['id'])->party_id);

    expect(Party::where('team_id', $this->team->id)->where('name', 'Internal')->count())->toBe(1);
});

test('requires team_id, name and owner_id', function () {
    $tool = new CreateProjectTool;

    // Missing name
    expect(fn () => $tool->execute(['team_id' => $this->team->id, 'owner_id' => $this->owner->id]))
        ->toThrow(InvalidArgumentException::class);

    // Missing owner_id (projects.owner_id is NOT NULL)
    expect(fn () => $tool->execute(['team_id' => $this->team->id, 'name' => 'X']))
        ->toThrow(InvalidArgumentException::class);
});
