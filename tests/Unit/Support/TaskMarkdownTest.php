<?php

declare(strict_types=1);

use App\Support\TaskMarkdown;

test('the export format is read back into tasks', function () {
    $markdown = <<<'MD'
# Homepage Redesign

**Project:** Website Relaunch

## Tasks (2)

- [x] **Draft wireframes** — Done · Ada Lovelace · Due 2026-10-05

  Cover desktop
  and mobile.

  - [x] Desktop
  - [ ] Mobile

- [ ] **Build hero section** — In Progress

MD;

    expect(TaskMarkdown::parse($markdown)['tasks'])->toBe([
        [
            'title' => 'Draft wireframes',
            'description' => "Cover desktop\nand mobile.",
            'dueDate' => '2026-10-05',
            'checklistItems' => [
                ['text' => 'Desktop', 'completed' => true],
                ['text' => 'Mobile', 'completed' => false],
            ],
        ],
        [
            'title' => 'Build hero section',
            'description' => null,
            'dueDate' => null,
            'checklistItems' => [],
        ],
    ]);
});

test('hand-written bullets and numbered items become tasks', function () {
    $markdown = "Some intro text\n\n* First\n+ Second\n1. Third\n2) Fourth — with a note\n";

    expect(array_column(TaskMarkdown::parse($markdown)['tasks'], 'title'))
        ->toBe(['First', 'Second', 'Third', 'Fourth — with a note']);
});

test('a file without a list is read as one task per line', function () {
    $text = "\u{FEFF}# Heading\r\nCall the client\r\n\r\n  Send the invoice  \r\n";

    expect(array_column(TaskMarkdown::parse($text)['tasks'], 'title'))
        ->toBe(['Call the client', 'Send the invoice']);
});

test('unindented text after a task does not bleed into its description', function () {
    $markdown = "- Task one\n  Its description\n\n## Later section\nLoose paragraph\n\n- Task two\n";

    $tasks = TaskMarkdown::parse($markdown)['tasks'];

    expect($tasks)->toHaveCount(2)
        ->and($tasks[0]['description'])->toBe('Its description')
        ->and($tasks[1]['description'])->toBeNull();
});

test('an invalid due date is ignored', function () {
    $tasks = TaskMarkdown::parse('- **Task** — To Do · Due 2026-02-31')['tasks'];

    expect($tasks[0]['dueDate'])->toBeNull();
});

test('titles are capped at 255 characters', function () {
    $tasks = TaskMarkdown::parse('- '.str_repeat('a', 300))['tasks'];

    expect(mb_strlen($tasks[0]['title']))->toBe(255);
});

test('an empty file yields no tasks', function () {
    expect(TaskMarkdown::parse("\n  \n# Only a heading\n"))->toBe(['tasks' => [], 'skipped' => 0]);
});

test('plain lines mixed into a list are counted as skipped rather than dropped silently', function () {
    $result = TaskMarkdown::parse("- Call Bob — about the invoice\nBuy milk\nCall Alice\n");

    expect(array_column($result['tasks'], 'title'))->toBe(['Call Bob — about the invoice'])
        ->and($result['skipped'])->toBe(2);
});

test('empty checkboxes and horizontal rules do not become tasks', function () {
    $result = TaskMarkdown::parse("- [ ]\n- [x] \n* * *\n---\n- Real task\n");

    expect(array_column($result['tasks'], 'title'))->toBe(['Real task'])
        ->and($result['skipped'])->toBe(2);
});

test('lines that are neither tasks nor task content are counted as skipped', function () {
    $result = TaskMarkdown::parse("Intro paragraph\n\n- Task A\n\nLoose paragraph\n# A heading\n");

    expect($result['tasks'])->toHaveCount(1)
        ->and($result['skipped'])->toBe(2);
});

test('the export metadata lines are neither tasks nor skipped', function () {
    $result = TaskMarkdown::parse("# Homepage Redesign\n\n**Project:** Website Relaunch\n\n## Tasks (0)\n\n_No tasks._\n");

    expect($result)->toBe(['tasks' => [], 'skipped' => 0]);
});

test('indented bullets without a checkbox stay in the description', function () {
    $markdown = "- [ ] **Task** — To Do\n\n  Notes:\n  - first point\n  - second point\n\n  - [x] Real item\n";

    $task = TaskMarkdown::parse($markdown)['tasks'][0];

    expect($task['description'])->toBe("Notes:\n- first point\n- second point")
        ->and($task['checklistItems'])->toBe([['text' => 'Real item', 'completed' => true]]);
});

test('tab-indented checklist items are read', function () {
    $task = TaskMarkdown::parse("- Task\n\t- [ ] Tabbed item\n")['tasks'][0];

    expect($task['checklistItems'])->toBe([['text' => 'Tabbed item', 'completed' => false]]);
});
