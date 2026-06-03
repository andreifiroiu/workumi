import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatLocalDate, getPresetDate } from '../date-utils';

describe('formatLocalDate', () => {
    it('formats a date as YYYY-MM-DD using local time', () => {
        expect(formatLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    });

    it('zero-pads month and day', () => {
        expect(formatLocalDate(new Date(2026, 8, 9))).toBe('2026-09-09');
    });
});

describe('getPresetDate', () => {
    beforeEach(() => {
        // Wednesday, 2026-06-03
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 5, 3, 14, 30, 0));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns today', () => {
        expect(getPresetDate('today')).toBe('2026-06-03');
    });

    it('returns tomorrow', () => {
        expect(getPresetDate('tomorrow')).toBe('2026-06-04');
    });

    it('returns the next Monday (never today even if today is Monday)', () => {
        expect(getPresetDate('nextMonday')).toBe('2026-06-08');
    });

    it('returns one month from today', () => {
        expect(getPresetDate('nextMonth')).toBe('2026-07-03');
    });
});
