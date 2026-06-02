import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CommunicationsIndex from '../index';

// Mock Inertia
vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
    router: {
        visit: vi.fn(),
        get: vi.fn(),
    },
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'Test User' } },
            currentOrganization: { id: '1', name: 'Test Org' },
            organizations: [],
            sidebarOpen: true,
        },
    }),
}));

// Mock the app layout to simplify testing
vi.mock('@/layouts/app-layout', () => ({
    default: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="app-layout">{children}</div>
    ),
}));

describe('CommunicationsIndex', () => {
    const mockFilters = {
        type: null,
        message_type: null,
        from: null,
        to: null,
        search: null,
    };

    const mockFilterOptions = {
        types: [
            { value: 'project', label: 'Project' },
            { value: 'work_order', label: 'Work Order' },
            { value: 'task', label: 'Task' },
        ],
        messageTypes: [
            { value: 'note', label: 'Note', color: 'gray' },
            { value: 'decision', label: 'Decision', color: 'green' },
            { value: 'question', label: 'Question', color: 'amber' },
        ],
    };

    const mockMessages = {
        data: [
            {
                id: '1',
                threadId: 'thread-1',
                authorId: '1',
                authorName: 'John Doe',
                authorType: 'human',
                timestamp: new Date().toISOString(),
                content: 'Test message content',
                type: 'note',
                typeLabel: 'Note',
                typeColor: 'gray',
                editedAt: null,
                canEdit: true,
                canDelete: true,
                mentions: [],
                attachments: [],
                reactions: [],
                workItem: {
                    type: 'project',
                    typeLabel: 'Project',
                    id: 'proj-1',
                    name: 'Test Project',
                    route: '/work/projects/proj-1',
                },
            },
            {
                id: '2',
                threadId: 'thread-2',
                authorId: '2',
                authorName: 'Jane Smith',
                authorType: 'human',
                timestamp: new Date().toISOString(),
                content: 'Another message',
                type: 'decision',
                typeLabel: 'Decision',
                typeColor: 'green',
                editedAt: null,
                canEdit: false,
                canDelete: false,
                mentions: [],
                attachments: [],
                reactions: [],
                workItem: {
                    type: 'task',
                    typeLabel: 'Task',
                    id: 'task-1',
                    name: 'Test Task',
                    route: '/work/tasks/task-1',
                },
            },
        ],
        meta: {
            total: 2,
            currentPage: 1,
            perPage: 15,
            lastPage: 1,
        },
        links: {
            first: '/communications?page=1',
            last: '/communications?page=1',
            prev: null,
            next: null,
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders CommunicationsIndex page with filters', () => {
        render(
            <CommunicationsIndex
                messages={mockMessages}
                filters={mockFilters}
                filterOptions={mockFilterOptions}
            />
        );

        // Check for the title
        expect(screen.getByText('Communications')).toBeInTheDocument();

        // Check for filter controls
        expect(screen.getByLabelText(/work item type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/message type/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/search messages/i)).toBeInTheDocument();
    });

    it('displays messages with work item context', () => {
        render(
            <CommunicationsIndex
                messages={mockMessages}
                filters={mockFilters}
                filterOptions={mockFilterOptions}
            />
        );

        // Check that messages are displayed
        expect(screen.getByText('Test message content')).toBeInTheDocument();
        expect(screen.getByText('Another message')).toBeInTheDocument();

        // Check author names are displayed
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();

        // Check work item context is displayed
        expect(screen.getByText('Test Project')).toBeInTheDocument();
        expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    it('displays empty state when no messages', () => {
        const emptyMessages = {
            data: [],
            meta: {
                total: 0,
                currentPage: 1,
                perPage: 15,
                lastPage: 1,
            },
            links: {
                first: null,
                last: null,
                prev: null,
                next: null,
            },
        };

        render(
            <CommunicationsIndex
                messages={emptyMessages}
                filters={mockFilters}
                filterOptions={mockFilterOptions}
            />
        );

        expect(screen.getByText(/no messages found/i)).toBeInTheDocument();
    });

    it('displays pagination when there are multiple pages', () => {
        const paginatedMessages = {
            ...mockMessages,
            meta: {
                total: 30,
                currentPage: 1,
                perPage: 15,
                lastPage: 2,
            },
            links: {
                first: '/communications?page=1',
                last: '/communications?page=2',
                prev: null,
                next: '/communications?page=2',
            },
        };

        render(
            <CommunicationsIndex
                messages={paginatedMessages}
                filters={mockFilters}
                filterOptions={mockFilterOptions}
            />
        );

        // Check pagination info is displayed
        expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    });
});
