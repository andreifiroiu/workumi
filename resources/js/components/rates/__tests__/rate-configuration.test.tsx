import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TeamMemberRateTable } from '../team-member-rate-table';
import { RateEditForm } from '../rate-edit-form';

const mockRouterPost = vi.fn();

vi.mock('@inertiajs/react', () => ({
    router: {
        post: (...args: unknown[]) => mockRouterPost(...args),
    },
}));

const mockRates = [
    {
        userId: '10',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        currentRate: {
            id: '1',
            internalRate: 75.0,
            billingRate: 125.0,
            effectiveDate: '2024-01-01',
        },
        rateHistory: [
            {
                id: '1',
                internalRate: 75.0,
                billingRate: 125.0,
                effectiveDate: '2024-01-01',
            },
        ],
    },
    {
        userId: '11',
        userName: 'Jane Smith',
        userEmail: 'jane@example.com',
        currentRate: {
            id: '3',
            internalRate: 85.0,
            billingRate: 150.0,
            effectiveDate: '2024-01-15',
        },
        rateHistory: [
            {
                id: '3',
                internalRate: 85.0,
                billingRate: 150.0,
                effectiveDate: '2024-01-15',
            },
            {
                id: '2',
                internalRate: 80.0,
                billingRate: 140.0,
                effectiveDate: '2023-06-01',
            },
        ],
    },
    {
        userId: '12',
        userName: 'Bob Wilson',
        userEmail: 'bob@example.com',
        currentRate: null,
        rateHistory: [],
    },
];

const mockTeamMembers = [
    { id: '10', name: 'John Doe', email: 'john@example.com' },
    { id: '11', name: 'Jane Smith', email: 'jane@example.com' },
    { id: '12', name: 'Bob Wilson', email: 'bob@example.com' },
];

describe('TeamMemberRateTable', () => {
    beforeEach(() => {
        mockRouterPost.mockReset();
    });

    it('renders team members with their rates', () => {
        render(<TeamMemberRateTable rates={mockRates} teamMembers={mockTeamMembers} />);

        // Check that all team members are displayed
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();

        // Check that rates are displayed
        expect(screen.getByText('$75.00')).toBeInTheDocument();
        expect(screen.getByText('$125.00')).toBeInTheDocument();
        expect(screen.getByText('$85.00')).toBeInTheDocument();
        expect(screen.getByText('$150.00')).toBeInTheDocument();

        // Check that team member without rates shows placeholder
        expect(screen.getAllByText('Not set')).toHaveLength(3); // 3 "Not set" for Bob Wilson (internal, billing, date)
    });

    it('displays effective dates correctly', () => {
        render(<TeamMemberRateTable rates={mockRates} teamMembers={mockTeamMembers} />);

        // Check that formatted dates are displayed
        expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
        expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
    });

    it('shows Add Rate buttons for each team member', () => {
        render(<TeamMemberRateTable rates={mockRates} teamMembers={mockTeamMembers} />);

        // Each team member row should have an "Add Rate" button
        const addRateButtons = screen.getAllByRole('button', { name: /add.*rate/i });
        expect(addRateButtons.length).toBe(3);
    });

    it('shows expand button for members with rate history', () => {
        render(<TeamMemberRateTable rates={mockRates} teamMembers={mockTeamMembers} />);

        // Jane Smith has rate history (2 rates), should have expand button
        const expandButtons = screen.getAllByRole('button', { name: /expand|collapse/i });
        expect(expandButtons.length).toBe(1); // Only Jane has history to expand
    });

    it('expands to show rate history when clicked', async () => {
        render(<TeamMemberRateTable rates={mockRates} teamMembers={mockTeamMembers} />);

        // Find and click the expand button
        const expandButton = screen.getByRole('button', { name: /expand/i });
        fireEvent.click(expandButton);

        // Should now show historical rates
        await waitFor(() => {
            // The text contains Unicode "└" so use partial match
            expect(screen.getByText(/Previous rate 1/)).toBeInTheDocument();
            expect(screen.getByText('$80.00')).toBeInTheDocument();
            expect(screen.getByText('$140.00')).toBeInTheDocument();
            expect(screen.getByText('Jun 1, 2023')).toBeInTheDocument();
        });
    });
});

describe('RateEditForm', () => {
    beforeEach(() => {
        mockRouterPost.mockReset();
    });

    it('validates rate fields require positive numbers', async () => {
        const onSuccess = vi.fn();

        render(
            <RateEditForm
                userId="10"
                userName="John Doe"
                onSuccess={onSuccess}
            />
        );

        // Fill in negative internal rate
        const internalRateInput = screen.getByLabelText(/internal rate/i);
        fireEvent.change(internalRateInput, { target: { value: '-50' } });

        // Fill in valid billing rate
        const billingRateInput = screen.getByLabelText(/billing rate/i);
        fireEvent.change(billingRateInput, { target: { value: '100' } });

        // Submit the form
        const form = screen.getByRole('form', { name: /rate creation form/i });
        fireEvent.submit(form);

        // Validation error should appear
        await waitFor(() => {
            expect(screen.getByText(/must be a positive number/i)).toBeInTheDocument();
        });

        // Form should not be submitted
        expect(mockRouterPost).not.toHaveBeenCalled();
    });

    it('validates rates have max 2 decimal places', async () => {
        const onSuccess = vi.fn();

        render(
            <RateEditForm
                userId="10"
                userName="John Doe"
                onSuccess={onSuccess}
            />
        );

        // Fill in rate with too many decimal places (using string value)
        const internalRateInput = screen.getByLabelText(/internal rate/i);
        // Use fireEvent with explicit string value to test validation
        fireEvent.change(internalRateInput, { target: { value: '75.999' } });

        // Fill in valid billing rate
        const billingRateInput = screen.getByLabelText(/billing rate/i);
        fireEvent.change(billingRateInput, { target: { value: '100.00' } });

        // Submit the form
        const form = screen.getByRole('form', { name: /rate creation form/i });
        fireEvent.submit(form);

        // Validation error should appear
        await waitFor(() => {
            expect(screen.getByText(/maximum 2 decimal places/i)).toBeInTheDocument();
        });

        // Form should not be submitted
        expect(mockRouterPost).not.toHaveBeenCalled();
    });

    it('effective_date picker accepts valid dates', async () => {
        render(
            <RateEditForm
                userId="10"
                userName="John Doe"
            />
        );

        // Find the effective date input
        const dateInput = screen.getByLabelText(/effective date/i);
        expect(dateInput).toBeInTheDocument();

        // Input should accept date values
        fireEvent.change(dateInput, { target: { value: '2024-06-15' } });
        expect(dateInput).toHaveValue('2024-06-15');
    });

    it('submits form with valid data - always creates new rate', async () => {
        const onSuccess = vi.fn();

        mockRouterPost.mockImplementation((_url, _data, options) => {
            options?.onSuccess?.();
            options?.onFinish?.();
        });

        render(
            <RateEditForm
                userId="10"
                userName="John Doe"
                onSuccess={onSuccess}
            />
        );

        // Fill in valid rates
        const internalRateInput = screen.getByLabelText(/internal rate/i);
        const billingRateInput = screen.getByLabelText(/billing rate/i);
        const dateInput = screen.getByLabelText(/effective date/i);

        fireEvent.change(internalRateInput, { target: { value: '75.50' } });
        fireEvent.change(billingRateInput, { target: { value: '125.00' } });
        fireEvent.change(dateInput, { target: { value: '2024-06-01' } });

        // Submit the form
        const submitButton = screen.getByRole('button', { name: /create/i });
        fireEvent.click(submitButton);

        // Wait for router.post to be called
        await waitFor(() => {
            expect(mockRouterPost).toHaveBeenCalled();
        });

        // Verify the call arguments - should always POST (create), never PATCH
        expect(mockRouterPost).toHaveBeenCalledWith(
            '/account/settings/rates',
            expect.objectContaining({
                user_id: '10',
                internal_rate: 75.5,
                billing_rate: 125,
                effective_date: '2024-06-01',
            }),
            expect.any(Object)
        );

        expect(onSuccess).toHaveBeenCalled();
    });

    it('defaults effective date to today', () => {
        render(
            <RateEditForm
                userId="10"
                userName="John Doe"
            />
        );

        const dateInput = screen.getByLabelText(/effective date/i);
        const today = new Date().toISOString().split('T')[0];
        expect(dateInput).toHaveValue(today);
    });
});
