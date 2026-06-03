import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatePresetButtons } from '../date-preset-buttons';

describe('DatePresetButtons', () => {
    beforeEach(() => {
        // Wednesday, 2026-06-03
        vi.useFakeTimers({ shouldAdvanceTime: true });
        vi.setSystemTime(new Date(2026, 5, 3, 9, 0, 0));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the four default presets', () => {
        render(<DatePresetButtons onSelect={vi.fn()} />);

        expect(
            screen.getByRole('button', { name: 'Today' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Tomorrow' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Next Monday' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Next Month' }),
        ).toBeInTheDocument();
    });

    it('calls onSelect with the preset date when clicked', async () => {
        const onSelect = vi.fn();
        const user = userEvent.setup();
        render(<DatePresetButtons onSelect={onSelect} />);

        await user.click(screen.getByRole('button', { name: 'Tomorrow' }));

        expect(onSelect).toHaveBeenCalledWith('2026-06-04');
    });
});
