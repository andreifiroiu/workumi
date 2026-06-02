import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RoutingRecommendations } from '../routing-recommendations';
import { DispatcherToggle } from '../dispatcher-toggle';

// Mock Inertia router
vi.mock('@inertiajs/react', () => ({
    router: {
        post: vi.fn(),
        patch: vi.fn(),
    },
    usePage: () => ({
        props: {
            auth: { user: { id: '1', name: 'Test User' } },
        },
    }),
}));

// Mock routing candidates data
const mockCandidates = [
    {
        userId: 1,
        userName: 'Alice Johnson',
        overallScore: 92,
        skillScore: 95,
        capacityScore: 89,
        confidence: 'high' as const,
        skillMatches: [
            { skillName: 'React', proficiency: 3 as const, weight: 0.4 },
            { skillName: 'TypeScript', proficiency: 3 as const, weight: 0.3 },
            { skillName: 'UI/UX', proficiency: 2 as const, weight: 0.3 },
        ],
        capacityAnalysis: {
            availableHours: 24,
            capacityPerWeek: 40,
            currentWorkload: 16,
            percentageAvailable: 60,
        },
        reasoning: 'Alice has advanced skills in React and TypeScript with 60% capacity available.',
    },
    {
        userId: 2,
        userName: 'Bob Smith',
        overallScore: 78,
        skillScore: 85,
        capacityScore: 71,
        confidence: 'medium' as const,
        skillMatches: [
            { skillName: 'React', proficiency: 2 as const, weight: 0.4 },
            { skillName: 'TypeScript', proficiency: 2 as const, weight: 0.3 },
        ],
        capacityAnalysis: {
            availableHours: 12,
            capacityPerWeek: 40,
            currentWorkload: 28,
            percentageAvailable: 30,
        },
        reasoning: 'Bob has intermediate skills but limited capacity at 30%.',
    },
    {
        userId: 3,
        userName: 'Carol Davis',
        overallScore: 65,
        skillScore: 70,
        capacityScore: 60,
        confidence: 'low' as const,
        skillMatches: [
            { skillName: 'JavaScript', proficiency: 2 as const, weight: 0.3 },
        ],
        capacityAnalysis: {
            availableHours: 8,
            capacityPerWeek: 40,
            currentWorkload: 32,
            percentageAvailable: 20,
        },
        reasoning: 'Carol has basic matching skills but low capacity.',
    },
];

describe('DispatcherToggle', () => {
    it('renders toggle in unchecked state by default', () => {
        const onChange = vi.fn();

        render(
            <DispatcherToggle
                checked={false}
                onCheckedChange={onChange}
            />
        );

        const toggle = screen.getByRole('switch');
        expect(toggle).toBeInTheDocument();
        expect(toggle).not.toBeChecked();
        expect(screen.getByText(/enable dispatcher agent/i)).toBeInTheDocument();
    });

    it('calls onCheckedChange when toggled', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(
            <DispatcherToggle
                checked={false}
                onCheckedChange={onChange}
            />
        );

        const toggle = screen.getByRole('switch');
        await user.click(toggle);

        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('renders in checked state when checked prop is true', () => {
        const onChange = vi.fn();

        render(
            <DispatcherToggle
                checked={true}
                onCheckedChange={onChange}
            />
        );

        const toggle = screen.getByRole('switch');
        expect(toggle).toBeChecked();
    });
});

describe('RoutingRecommendations', () => {
    it('displays top 3+ candidates with scores', () => {
        const onSelect = vi.fn();

        render(
            <RoutingRecommendations
                candidates={mockCandidates}
                onSelectCandidate={onSelect}
            />
        );

        // Check all 3 candidates are displayed
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
        expect(screen.getByText('Carol Davis')).toBeInTheDocument();

        // Check scores are displayed
        expect(screen.getByText('92%')).toBeInTheDocument();
        expect(screen.getByText('78%')).toBeInTheDocument();
        expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('displays confidence badges for each recommendation', () => {
        const onSelect = vi.fn();

        render(
            <RoutingRecommendations
                candidates={mockCandidates}
                onSelectCandidate={onSelect}
            />
        );

        // Check confidence badges
        expect(screen.getByText(/high/i)).toBeInTheDocument();
        expect(screen.getByText(/medium/i)).toBeInTheDocument();
        expect(screen.getByText(/low/i)).toBeInTheDocument();
    });

    it('shows skill matches and proficiency levels', async () => {
        const onSelect = vi.fn();

        render(
            <RoutingRecommendations
                candidates={mockCandidates}
                onSelectCandidate={onSelect}
            />
        );

        // The first candidate shows skills by default or on expand
        // Find the skills section for Alice
        expect(screen.getByText('React')).toBeInTheDocument();
        expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });

    it('allows selection of a candidate', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();

        render(
            <RoutingRecommendations
                candidates={mockCandidates}
                onSelectCandidate={onSelect}
            />
        );

        // Find and click the select button for first candidate
        const selectButtons = screen.getAllByRole('button', { name: /select/i });
        await user.click(selectButtons[0]);

        expect(onSelect).toHaveBeenCalledWith(1);
    });

    it('displays capacity analysis information', () => {
        const onSelect = vi.fn();

        render(
            <RoutingRecommendations
                candidates={mockCandidates}
                onSelectCandidate={onSelect}
            />
        );

        // Check capacity information is displayed (use getAllBy since it appears multiple times)
        const availableHoursElements = screen.getAllByText(/24h available/i);
        expect(availableHoursElements.length).toBeGreaterThanOrEqual(1);

        // Check capacity percentage is displayed (may appear multiple times)
        const capacityElements = screen.getAllByText(/60%/);
        expect(capacityElements.length).toBeGreaterThanOrEqual(1);
    });
});
