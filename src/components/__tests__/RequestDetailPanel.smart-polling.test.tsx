import { render } from '@testing-library/react';
import RequestDetailPanel from '../RequestDetailPanel';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Smart Polling Tests for RequestDetailPanel
 * 
 * These tests verify the smart polling configuration passed to useQuery
 */

const mockInvalidateList = vi.fn();
const mockInvalidateGetById = vi.fn();
const mockUseQuery = vi.fn();
const mockCreateNewRequest = vi.fn();

// Mock dependencies
vi.mock('@/utils/trpc', () => ({
    trpc: {
        useUtils: () => ({
            requests: {
                getById: { invalidate: mockInvalidateGetById },
                list: { invalidate: mockInvalidateList },
            },
        }),
        requests: {
            getById: {
                useQuery: (...args: any[]) => mockUseQuery(...args),
            },
            retry: {
                useMutation: () => ({
                    mutate: vi.fn(),
                    status: 'idle'
                }),
            },
        },
    },
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock('react-markdown', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('diff2html', () => ({
    html: () => '<div>Mock Diff</div>',
}));

vi.mock('../ShikiCodeRenderer', () => ({
    default: ({ code }: { code: string }) => <pre>{code}</pre>,
}));

vi.mock('next-themes', () => ({
    useTheme: () => ({
        theme: 'light',
        systemTheme: 'light',
    }),
}));

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

const mockStore = {
    selectedRequestId: null as number | null,
    createNewRequest: mockCreateNewRequest,
};

vi.mock('@/store/useUIStore', () => ({
    useUIStore: () => mockStore,
}));

describe('RequestDetailPanel Smart Polling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStore.selectedRequestId = null;
        mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
    });

    describe('refetchInterval configuration', () => {
        it('should configure refetchInterval as a function', () => {
            mockStore.selectedRequestId = 1;
            mockUseQuery.mockReturnValue({ isLoading: false, data: null, error: null });

            render(<RequestDetailPanel />);

            expect(mockUseQuery).toHaveBeenCalled();
            const queryOptions = mockUseQuery.mock.calls[0]?.[1];
            expect(typeof queryOptions?.refetchInterval).toBe('function');
        });

        it('should return 5000ms for QUEUED status', () => {
            mockStore.selectedRequestId = 1;
            mockUseQuery.mockReturnValue({ isLoading: false, data: { status: 'QUEUED' }, error: null });

            render(<RequestDetailPanel />);

            const queryOptions = mockUseQuery.mock.calls[0]?.[1];
            const refetchInterval = queryOptions?.refetchInterval;

            // Simulate the query state
            const result = refetchInterval({ state: { data: { status: 'QUEUED' }, error: null } });
            expect(result).toBe(5000);
        });

        it('should return 5000ms for PROCESSING status', () => {
            mockStore.selectedRequestId = 1;
            mockUseQuery.mockReturnValue({ isLoading: false, data: { status: 'PROCESSING' }, error: null });

            render(<RequestDetailPanel />);

            const queryOptions = mockUseQuery.mock.calls[0]?.[1];
            const refetchInterval = queryOptions?.refetchInterval;

            const result = refetchInterval({ state: { data: { status: 'PROCESSING' }, error: null } });
            expect(result).toBe(5000);
        });

        it('should return false for COMPLETED status (stop polling)', () => {
            mockStore.selectedRequestId = 1;
            mockUseQuery.mockReturnValue({ isLoading: false, data: { status: 'COMPLETED' }, error: null });

            render(<RequestDetailPanel />);

            const queryOptions = mockUseQuery.mock.calls[0]?.[1];
            const refetchInterval = queryOptions?.refetchInterval;

            const result = refetchInterval({ state: { data: { status: 'COMPLETED' }, error: null } });
            expect(result).toBe(false);
        });

        it('should return false for FAILED status (stop polling)', () => {
            mockStore.selectedRequestId = 1;
            mockUseQuery.mockReturnValue({ isLoading: false, data: { status: 'FAILED' }, error: null });

            render(<RequestDetailPanel />);

            const queryOptions = mockUseQuery.mock.calls[0]?.[1];
            const refetchInterval = queryOptions?.refetchInterval;

            const result = refetchInterval({ state: { data: { status: 'FAILED' }, error: null } });
            expect(result).toBe(false);
        });

        it('should return false on error (stop polling on 404)', () => {
            mockStore.selectedRequestId = 1;
            const mockError = { data: { code: 'NOT_FOUND' } };
            mockUseQuery.mockReturnValue({ isLoading: false, data: null, error: mockError });

            render(<RequestDetailPanel />);

            const queryOptions = mockUseQuery.mock.calls[0]?.[1];
            const refetchInterval = queryOptions?.refetchInterval;

            const result = refetchInterval({ state: { data: null, error: mockError } });
            expect(result).toBe(false);
        });

        it('should return 5000ms when no data yet (initial load)', () => {
            mockStore.selectedRequestId = 1;
            mockUseQuery.mockReturnValue({ isLoading: true, data: null, error: null });

            render(<RequestDetailPanel />);

            const queryOptions = mockUseQuery.mock.calls[0]?.[1];
            const refetchInterval = queryOptions?.refetchInterval;

            const result = refetchInterval({ state: { data: null, error: null } });
            expect(result).toBe(5000);
        });
    });

    describe('query options', () => {
        it('should set retry to false to prevent infinite retry on 404', () => {
            mockStore.selectedRequestId = 1;
            mockUseQuery.mockReturnValue({ isLoading: false, data: null, error: null });

            render(<RequestDetailPanel />);

            const queryOptions = mockUseQuery.mock.calls[0]?.[1];
            expect(queryOptions?.retry).toBe(false);
        });

        it('should disable refetchIntervalInBackground', () => {
            mockStore.selectedRequestId = 1;
            mockUseQuery.mockReturnValue({ isLoading: false, data: null, error: null });

            render(<RequestDetailPanel />);

            const queryOptions = mockUseQuery.mock.calls[0]?.[1];
            expect(queryOptions?.refetchIntervalInBackground).toBe(false);
        });

        it('should only be enabled when selectedRequestId exists and no propRequest', () => {
            mockStore.selectedRequestId = 1;
            mockUseQuery.mockReturnValue({ isLoading: false, data: null, error: null });

            render(<RequestDetailPanel />);

            const queryOptions = mockUseQuery.mock.calls[0]?.[1];
            expect(queryOptions?.enabled).toBe(true);
        });

        it('should be disabled when selectedRequestId is null', () => {
            mockStore.selectedRequestId = null;
            mockUseQuery.mockReturnValue({ isLoading: false, data: null, error: null });

            render(<RequestDetailPanel />);

            // When no request selected, useQuery should still be called but with enabled: false
            const queryOptions = mockUseQuery.mock.calls[0]?.[1];
            expect(queryOptions?.enabled).toBe(false);
        });
    });
});
