<?php

declare(strict_types=1);

use App\Support\ChecklistItems;

test('a bare string becomes a full item', function () {
    $normalized = ChecklistItems::normalize(['Review the brief']);

    expect($normalized)->toHaveCount(1)
        ->and($normalized[0]['text'])->toBe('Review the brief')
        ->and($normalized[0]['completed'])->toBeFalse()
        ->and($normalized[0]['id'])->toBeString()->not->toBeEmpty();
});

test('an already canonical item passes through unchanged', function () {
    $item = ['id' => 'item-1', 'text' => 'Ship it', 'completed' => true];

    expect(ChecklistItems::normalize([$item]))->toBe([$item]);
});

test('a missing id is filled in so the item can be toggled', function () {
    // The API and MCP surfaces validate `text` but never assign an `id`, and
    // every toggle/edit/delete endpoint matches on it.
    $normalized = ChecklistItems::normalize([['text' => 'No id here']]);

    expect($normalized[0]['id'])->toBeString()->not->toBeEmpty()
        ->and($normalized[0]['completed'])->toBeFalse();
});

test('an empty id is replaced rather than kept', function () {
    $normalized = ChecklistItems::normalize([['id' => '', 'text' => 'Blank id']]);

    expect($normalized[0]['id'])->not->toBe('');
});

test('ids are unique across generated items', function () {
    $normalized = ChecklistItems::normalize(['One', 'Two', 'Three']);

    expect(collect($normalized)->pluck('id')->unique())->toHaveCount(3);
});

test('completed is coerced to a boolean', function () {
    $normalized = ChecklistItems::normalize([['text' => 'Truthy', 'completed' => 1]]);

    expect($normalized[0]['completed'])->toBeTrue();
});

test('the agent label field is accepted as text', function () {
    $normalized = ChecklistItems::normalize([['label' => 'From a playbook']]);

    expect($normalized[0]['text'])->toBe('From a playbook');
});

test('values that are neither string nor array are dropped', function () {
    $normalized = ChecklistItems::normalize(['Keep me', 42, null, true, 'Keep me too']);

    expect($normalized)->toHaveCount(2)
        ->and(collect($normalized)->pluck('text')->all())->toBe(['Keep me', 'Keep me too']);
});

test('null and empty input normalize to an empty list', function () {
    expect(ChecklistItems::normalize(null))->toBe([])
        ->and(ChecklistItems::normalize([]))->toBe([]);
});

test('normalizing is idempotent', function () {
    $once = ChecklistItems::normalize(['A string', ['text' => 'An object']]);

    expect(ChecklistItems::normalize($once))->toBe($once);
});
