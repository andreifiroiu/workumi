import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateDefaultDueDate, formatLocalDate, getPresetDate } from '../date-utils';

describe('formatLocalDate', () => {
    it('formats a date as YYYY-MM-DD using local components', () => {
        expect(formatLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05');
        expect(formatLocalDate(new Date(2026, 11, 31))).toBe('2026-12-31');
    });
});

describe('getPresetDate', () => {
    beforeEach(() => {
        // Wednesday, 2026-06-03
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 5, 3, 14, 30));
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

    it('returns the next Monday (never today)', () => {
        expect(getPresetDate('nextMonday')).toBe('2026-06-08');
    });

    it('returns one month out', () => {
        expect(getPresetDate('nextMonth')).toBe('2026-07-03');
    });
});

describe('calculateDefaultDueDate', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 5, 3, 14, 30));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('uses the work order due date when within one week and in the future', () => {
        expect(calculateDefaultDueDate('2026-06-06')).toBe('2026-06-06');
    });

    it('defaults to 7 days out when the work order due date is more than a week away', () => {
        expect(calculateDefaultDueDate('2026-08-01')).toBe('2026-06-10');
    });

    it('defaults to 7 days out when the work order due date is in the past', () => {
        expect(calculateDefaultDueDate('2026-01-01')).toBe('2026-06-10');
    });

    it('defaults to 7 days out when no work order due date is given', () => {
        expect(calculateDefaultDueDate(null)).toBe('2026-06-10');
    });
});
