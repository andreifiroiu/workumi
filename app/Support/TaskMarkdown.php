<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\TaskStatus;
use RuntimeException;

/**
 * Reads a task list back out of Markdown or plain text.
 *
 * Understands the format WorkOrderTaskExportController writes — a top-level
 * bullet per task, `**Title** — Status · Assignee · Due YYYY-MM-DD`, indented
 * description lines and indented checkbox items — so an export can be
 * imported again. Hand-written lists work too: any top-level bullet or
 * numbered item is a task, and only indented items with a checkbox become
 * checklist items, so an ordinary nested list stays in the description. A
 * file with no list at all is read as one task per non-empty line, which
 * covers a plain .txt of titles.
 *
 * In a list, a line that is neither a task nor indented under one cannot be
 * placed; it is counted in `skipped` so the caller can say so instead of
 * dropping it silently. Headings, horizontal rules and the export's own
 * metadata lines are structure, not content, and are not counted.
 */
final class TaskMarkdown
{
    private const string TOP_LEVEL_ITEM = '/^ ?(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\](?:\s+|$))?(.*)$/u';

    private const string CHECKLIST_ITEM = '/^ {2,}(?:[-*+]|\d+[.)])\s+\[([ xX])\]\s+(.+)$/u';

    private const string HEADING = '/^#{1,6}(?:\s|$)/u';

    private const string THEMATIC_BREAK = '/^ {0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/u';

    /**
     * The `**Project:** …` and `_No tasks._` lines the exporter writes.
     */
    private const string EXPORT_METADATA = '/^(?:\*\*[^*]+:\*\*.*|_No tasks\._)$/u';

    /**
     * @return array{tasks: list<array{title: string, description: ?string, dueDate: ?string, checklistItems: list<array{text: string, completed: bool}>}>, skipped: int}
     */
    public static function parse(string $content): array
    {
        $content = preg_replace('/^\x{FEFF}/u', '', $content) ?? $content;
        $lines = preg_split('/\R/u', $content);

        if ($lines === false) {
            throw new RuntimeException('Could not split the task list into lines: '.preg_last_error_msg());
        }

        // Treat a leading tab as one level of list indentation.
        $lines = array_map(
            fn (string $line): string => preg_replace_callback('/^\t+/', fn (array $tabs): string => str_repeat('  ', strlen($tabs[0])), $line) ?? $line,
            $lines,
        );

        $hasList = array_any($lines, fn (string $line): bool => self::isTopLevelItem($line));

        return $hasList ? self::parseList($lines) : self::parseLines($lines);
    }

    /**
     * @param  list<string>  $lines
     * @return array{tasks: list<array{title: string, description: ?string, dueDate: ?string, checklistItems: list<array{text: string, completed: bool}>}>, skipped: int}
     */
    private static function parseList(array $lines): array
    {
        $tasks = [];
        $skipped = 0;
        $current = null;
        $descriptionLines = [];

        $close = function () use (&$tasks, &$current, &$descriptionLines): void {
            if ($current !== null) {
                $tasks[] = self::finish($current, $descriptionLines);
            }

            $current = null;
            $descriptionLines = [];
        };

        foreach ($lines as $line) {
            if (self::isStructure($line)) {
                $close();

                continue;
            }

            if (self::isTopLevelItem($line)) {
                $close();
                preg_match(self::TOP_LEVEL_ITEM, $line, $matches);
                $current = self::parseHeadline($matches[1]);

                if ($current['title'] === '') {
                    $current = null;
                    $skipped++;
                }

                continue;
            }

            if (trim($line) === '') {
                if ($current !== null) {
                    $descriptionLines[] = '';
                }

                continue;
            }

            $isIndented = preg_match('/^\s/u', $line) === 1;

            if ($current === null || ! $isIndented) {
                $close();
                $skipped++;

                continue;
            }

            if (preg_match(self::CHECKLIST_ITEM, $line, $matches) === 1) {
                $current['checklistItems'][] = [
                    'text' => trim($matches[2]),
                    'completed' => strtolower($matches[1]) === 'x',
                ];

                continue;
            }

            $descriptionLines[] = $line;
        }

        $close();

        return ['tasks' => $tasks, 'skipped' => $skipped];
    }

    /**
     * @param  list<string>  $lines
     * @return array{tasks: list<array{title: string, description: ?string, dueDate: ?string, checklistItems: list<array{text: string, completed: bool}>}>, skipped: int}
     */
    private static function parseLines(array $lines): array
    {
        $tasks = [];

        foreach ($lines as $line) {
            $title = trim($line);

            if ($title === '' || self::isStructure($title)) {
                continue;
            }

            $tasks[] = [
                'title' => self::limitTitle($title),
                'description' => null,
                'dueDate' => null,
                'checklistItems' => [],
            ];
        }

        return ['tasks' => $tasks, 'skipped' => 0];
    }

    private static function isTopLevelItem(string $line): bool
    {
        return preg_match(self::TOP_LEVEL_ITEM, $line) === 1
            && preg_match(self::THEMATIC_BREAK, $line) !== 1;
    }

    private static function isStructure(string $line): bool
    {
        $trimmed = trim($line);

        return preg_match(self::HEADING, $trimmed) === 1
            || preg_match(self::THEMATIC_BREAK, $line) === 1
            || preg_match(self::EXPORT_METADATA, $trimmed) === 1;
    }

    /**
     * Splits `**Title** — Status · Assignee · Due 2026-10-05` into its parts.
     * Only the due date is kept from the metadata: status and assignee are
     * governed by workflow and team membership, not by what a file says. A
     * plain ` — ` is only read as metadata when what follows starts with a
     * status label, so `Call Bob — about the invoice` keeps its whole title.
     *
     * @return array{title: string, description: ?string, dueDate: ?string, checklistItems: list<array{text: string, completed: bool}>}
     */
    private static function parseHeadline(string $headline): array
    {
        $headline = trim($headline);
        $title = $headline;
        $meta = '';

        if (preg_match('/^\*\*(.+?)\*\*(?:\s+—\s+(.*))?$/u', $headline, $matches) === 1) {
            $title = $matches[1];
            $meta = $matches[2] ?? '';
        } elseif (str_contains($headline, ' — ')) {
            [$candidateTitle, $candidateMeta] = explode(' — ', $headline, 2);

            if (self::isExportMetadata($candidateMeta)) {
                $title = $candidateTitle;
                $meta = $candidateMeta;
            }
        }

        return [
            'title' => self::limitTitle(trim($title)),
            'description' => null,
            'dueDate' => self::dueDateFrom($meta),
            'checklistItems' => [],
        ];
    }

    private static function isExportMetadata(string $meta): bool
    {
        $firstSegment = trim(explode(' · ', $meta, 2)[0]);

        return in_array($firstSegment, array_map(fn (TaskStatus $status): string => $status->label(), TaskStatus::cases()), true);
    }

    private static function dueDateFrom(string $meta): ?string
    {
        if (preg_match('/(?:^|·)\s*Due (\d{4})-(\d{2})-(\d{2})\s*(?:·|$)/u', $meta, $matches) !== 1) {
            return null;
        }

        [, $year, $month, $day] = $matches;

        return checkdate((int) $month, (int) $day, (int) $year) ? "{$year}-{$month}-{$day}" : null;
    }

    /**
     * @param  array{title: string, description: ?string, dueDate: ?string, checklistItems: list<array{text: string, completed: bool}>}  $task
     * @param  list<string>  $descriptionLines
     * @return array{title: string, description: ?string, dueDate: ?string, checklistItems: list<array{text: string, completed: bool}>}
     */
    private static function finish(array $task, array $descriptionLines): array
    {
        $indents = array_map(
            fn (string $line): int => strlen($line) - strlen(ltrim($line)),
            array_filter($descriptionLines, fn (string $line): bool => $line !== ''),
        );
        $indent = $indents === [] ? 0 : min($indents);

        $description = trim(implode("\n", array_map(
            fn (string $line): string => rtrim(substr($line, $indent)),
            $descriptionLines,
        )));

        $task['description'] = $description === '' ? null : $description;

        return $task;
    }

    private static function limitTitle(string $title): string
    {
        return mb_substr($title, 0, 255);
    }
}
