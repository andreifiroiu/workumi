<?php

declare(strict_types=1);

use App\Models\User;
use App\Support\TeamAccess;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

test('allows only the teams it was built with', function () {
    $access = new TeamAccess(1, [3, 7], 3);

    expect($access->allows(3))->toBeTrue()
        ->and($access->allows(7))->toBeTrue()
        ->and($access->allows(9))->toBeFalse();
});

test('assert aborts with 403 for an unreachable team', function () {
    $access = new TeamAccess(1, [3], 3);

    $access->assert(3);

    expect(fn () => $access->assert(9))
        ->toThrow(HttpException::class);
});

test('resolve returns the requested team when it is reachable', function () {
    $access = new TeamAccess(1, [3, 7], 3);

    expect($access->resolve(7))->toBe(7);
});

test('resolve falls back to the default team for a single-team user', function () {
    $access = new TeamAccess(1, [3], 3);

    expect($access->resolve(null))->toBe(3);
});

test('resolve refuses to guess when several teams are reachable', function () {
    $owner = User::factory()->create();
    $first = $owner->createTeam(['name' => 'Acme']);
    $second = $owner->createTeam(['name' => 'Beta']);

    $access = new TeamAccess($owner->id, [$first->id, $second->id], $first->id);

    expect(fn () => $access->resolve(null))->toThrow(ValidationException::class);

    try {
        $access->resolve(null);
    } catch (ValidationException $e) {
        expect($e->errors()['team_id'][0])->toBe(
            'team_id is required: you have access to teams '.$first->id.' (Acme), '.$second->id.' (Beta).'
        );
    }
});

test('filter narrows to one team or spans them all', function () {
    $access = new TeamAccess(1, [3, 7], 3);

    expect($access->filter(null))->toBe([3, 7])
        ->and($access->filter(7))->toBe([7])
        ->and(fn () => $access->filter(9))->toThrow(HttpException::class);
});
