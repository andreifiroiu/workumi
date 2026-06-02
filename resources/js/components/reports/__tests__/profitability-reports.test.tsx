import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfitabilityTable, type ProfitabilityRow } from '../profitability-table';
import { ProfitabilitySummaryCards, type ProfitabilitySummary } from '../profitability-summary-cards';
import {
    getMarginColor,
    getMarginBgColor,
    formatCurrency,
    formatPercent,
    calculateMarginPercent,
} from '@/lib/profitability-utils';

// Mock data for tests
const mockProfitabilityData: ProfitabilityRow[] = [
    {
        id: 1,
        name: 'Project Alpha',
        budget: 50000,
        actualCost: 35000,
        revenue: 48000,
        margin: 13000,
        marginPercent: 27.08,
        utilization: 85,
    },
    {
        id: 2,
        name: 'Project Beta',
        budget: 30000,
        actualCost: 28000,
        revenue: 30000,
        margin: 2000,
        marginPercent: 6.67,
        utilization: 70,
    },
    {
        id: 3,
        name: 'Project Gamma',
        budget: 20000,
        actualCost: 25000,
        revenue: 18000,
        margin: -7000,
        marginPercent: -38.89,
        utilization: 60,
    },
];

const mockSummary: ProfitabilitySummary = {
    totalBudget: 100000,
    totalActualCost: 88000,
    totalRevenue: 96000,
    totalMargin: 8000,
    avgMarginPercent: 8.33,
};

describe('ProfitabilityTable', () => {
    it('renders correct columns for profitability data', () => {
        render(<ProfitabilityTable data={mockProfitabilityData} />);

        // Check header columns
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Budget')).toBeInTheDocument();
        expect(screen.getByText('Actual Cost')).toBeInTheDocument();
        expect(screen.getByText('Revenue')).toBeInTheDocument();
        expect(screen.getByText('Margin')).toBeInTheDocument();
        expect(screen.getByText('Margin %')).toBeInTheDocument();

        // Check row data is displayed
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
        expect(screen.getByText('Project Beta')).toBeInTheDocument();
        expect(screen.getByText('Project Gamma')).toBeInTheDocument();
    });

    it('shows utilization column when showUtilization is true', () => {
        render(<ProfitabilityTable data={mockProfitabilityData} showUtilization />);

        // Check that utilization column header is present
        expect(screen.getByText('Utilization')).toBeInTheDocument();

        // Check utilization values are displayed
        expect(screen.getByText('85.0%')).toBeInTheDocument();
        expect(screen.getByText('70.0%')).toBeInTheDocument();
        expect(screen.getByText('60.0%')).toBeInTheDocument();
    });

    it('hides utilization column when showUtilization is false', () => {
        render(<ProfitabilityTable data={mockProfitabilityData} showUtilization={false} />);

        // Check that utilization column header is NOT present
        expect(screen.queryByText('Utilization')).not.toBeInTheDocument();
    });

    it('shows empty message when data is empty', () => {
        render(<ProfitabilityTable data={[]} emptyMessage="No data available" />);

        expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('calls onRowClick when a row is clicked', () => {
        const handleRowClick = vi.fn();
        render(<ProfitabilityTable data={mockProfitabilityData} onRowClick={handleRowClick} />);

        // Click on a row
        fireEvent.click(screen.getByText('Project Alpha'));

        expect(handleRowClick).toHaveBeenCalledWith(mockProfitabilityData[0]);
    });
});

describe('Margin color coding utilities', () => {
    it('returns green color for positive margin (> 20%)', () => {
        const color = getMarginColor(25);
        expect(color).toContain('green');

        const bgColor = getMarginBgColor(25);
        expect(bgColor).toContain('green');
    });

    it('returns yellow color for low margin (0-20%)', () => {
        const color = getMarginColor(10);
        expect(color).toContain('yellow');

        const bgColor = getMarginBgColor(10);
        expect(bgColor).toContain('yellow');

        // Test edge case at exactly 0
        const colorAtZero = getMarginColor(0);
        expect(colorAtZero).toContain('yellow');

        // Test edge case at exactly 20
        const colorAt20 = getMarginColor(20);
        expect(colorAt20).toContain('yellow');
    });

    it('returns red color for negative margin (< 0%)', () => {
        const color = getMarginColor(-15);
        expect(color).toContain('red');

        const bgColor = getMarginBgColor(-15);
        expect(bgColor).toContain('red');
    });

    it('formats currency correctly', () => {
        expect(formatCurrency(1000)).toBe('$1,000.00');
        expect(formatCurrency(50.5)).toBe('$50.50');
        expect(formatCurrency(-100)).toBe('-$100.00');
    });

    it('formats percentage correctly', () => {
        expect(formatPercent(25.5)).toBe('25.5%');
        expect(formatPercent(-10.3)).toBe('-10.3%');
        expect(formatPercent(0)).toBe('0.0%');
    });

    it('calculates margin percent handling division by zero', () => {
        // Normal case
        expect(calculateMarginPercent(100, 80)).toBeCloseTo(20);

        // Division by zero case - returns 0
        expect(calculateMarginPercent(0, 50)).toBe(0);
    });
});

describe('ProfitabilitySummaryCards', () => {
    it('displays all summary card values', () => {
        render(<ProfitabilitySummaryCards summary={mockSummary} />);

        // Check for card titles
        expect(screen.getByText('Total Budget')).toBeInTheDocument();
        expect(screen.getByText('Total Actual Cost')).toBeInTheDocument();
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
        expect(screen.getByText('Total Margin')).toBeInTheDocument();
        expect(screen.getByText('Avg Margin %')).toBeInTheDocument();

        // Check for formatted values
        expect(screen.getByText('$100,000.00')).toBeInTheDocument();
        expect(screen.getByText('$88,000.00')).toBeInTheDocument();
        expect(screen.getByText('$96,000.00')).toBeInTheDocument();
        expect(screen.getByText('$8,000.00')).toBeInTheDocument();
        expect(screen.getByText('8.3%')).toBeInTheDocument();
    });

    it('applies correct color to margin cards based on margin value', () => {
        const negativeSummary: ProfitabilitySummary = {
            ...mockSummary,
            totalMargin: -5000,
            avgMarginPercent: -10,
        };

        render(<ProfitabilitySummaryCards summary={negativeSummary} />);

        // Find the margin value element and check it has red color class
        const marginValue = screen.getByText('-$5,000.00');
        expect(marginValue.className).toContain('red');
    });
});
