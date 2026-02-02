import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../Dashboard';

// Mock dependencies
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
    }),
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => 'en',
}));

// Mock tRPC to avoid complex context setup
vi.mock('@/utils/trpc', () => ({
    trpc: {
        useUtils: () => ({
            requests: {
                list: {
                    invalidate: vi.fn(),
                },
            },
        }),
        requests: {
            list: {
                useInfiniteQuery: () => ({
                    data: { pages: [{ items: [] }] },
                    fetchNextPage: vi.fn(),
                    hasNextPage: false,
                    isFetchingNextPage: false,
                }),
            },
            create: {
                useMutation: () => ({
                    mutateAsync: vi.fn().mockResolvedValue({ id: 123 }),
                }),
            },
        },
        settings: {
            getByKey: {
                useQuery: () => ({ data: 'true' }),
            },
        },
    },
}));

// Mock child components that have complex dependencies
vi.mock('@/components/RequestList', () => ({
    default: () => <div data-testid="request-list">Request List</div>,
}));

vi.mock('@/components/RequestDetailPanel', () => ({
    default: () => <div data-testid="request-detail-panel">Request Detail Panel</div>,
}));

// Keep real components for ThemeSwitcher and LanguageSwitcher to test integration

vi.mock('@/store/useUIStore', () => ({
    useUIStore: () => ({
        rightPanelMode: 'create',
        createNewRequest: vi.fn(),
        selectRequest: vi.fn(),
    }),
}));

describe('Dashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders header with title', () => {
        render(<Dashboard />);
        expect(screen.getByText('title')).toBeInTheDocument();
    });

    it('renders theme and language switchers in header', () => {
        render(<Dashboard />);
        // These are rendered by the real child components
        const buttons = screen.getAllByRole('button');
        // At minimum, we should have theme and language buttons
        expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('has proper layout structure with header and main sections', () => {
        const { container } = render(<Dashboard />);

        const header = container.querySelector('header');
        expect(header).toBeInTheDocument();

        const main = container.querySelector('main');
        expect(main).toBeInTheDocument();
    });

    it('shows SubmissionForm when rightPanelMode is create', () => {
        render(<Dashboard />);
        // When in create mode, should see the submission form button
        const submitButton = screen.getByText('submitButton');
        expect(submitButton).toBeInTheDocument();
    });

    it('has mobile menu and navigation buttons', () => {
        render(<Dashboard />);
        // Should have menu, theme, language, and potentially other navigation buttons
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
    });
});
