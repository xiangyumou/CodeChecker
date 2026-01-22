import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestDetailPanel from '../RequestDetailPanel';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as diff2html from 'diff2html'; // eslint-disable-line @typescript-eslint/no-unused-vars

// Mock dependencies
const mockUseQuery = vi.fn();
const mockCreateNewRequest = vi.fn();
const mockRetryMutate = vi.fn();
const mockInvalidateList = vi.fn();
const mockInvalidateGetById = vi.fn();

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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                useQuery: (...args: any[]) => mockUseQuery(...args),
            },
            retry: {
                useMutation: () => ({
                    mutate: mockRetryMutate,
                    status: 'idle'
                }),
            },
        },
    },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

// Mock react-markdown
vi.mock('react-markdown', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock diff2html with spy
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
const mockDiff2HtmlHtml = vi.fn((_diffInput: string, _options?: any) => '<div class="d2h-wrapper">Mock Diff HTML</div>');
vi.mock('diff2html', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    html: (diffInput: string, options?: any) => mockDiff2HtmlHtml(diffInput, options),
}));

// Mock ShikiCodeRenderer
vi.mock('../ShikiCodeRenderer', () => ({
    default: ({ code }: { code: string }) => <pre>{code}</pre>,
}));

// Mock next-themes
vi.mock('next-themes', () => ({
    useTheme: () => ({
        theme: 'light',
        systemTheme: 'light',
    }),
}));

// Mock store
const mockStore = {
    selectedRequestId: null as number | null,
    createNewRequest: mockCreateNewRequest,
};

vi.mock('@/store/useUIStore', () => ({
    useUIStore: () => mockStore,
}));

describe('RequestDetailPanel', () => {
    beforeEach(() => {
        mockUseQuery.mockReset();
        mockCreateNewRequest.mockReset();
        mockDiff2HtmlHtml.mockClear();
        mockRetryMutate.mockReset();
        // Default safe return
        mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });
        mockStore.selectedRequestId = null;
    });

    describe('Rendering states', () => {
        it('renders empty state when no request selected', () => {
            render(<RequestDetailPanel />);
            expect(screen.getByText('selectRequestToView')).toBeInTheDocument();
        });

        it('renders error state when request is not found', () => {
            mockStore.selectedRequestId = 999;
            mockUseQuery.mockReturnValue({ isLoading: false, data: null });

            render(<RequestDetailPanel />);
            expect(screen.getByText('requestNotFound')).toBeInTheDocument();
        });

        it('renders Loading state with skeleton UI and no actual content', () => {
            mockStore.selectedRequestId = 1;
            mockUseQuery.mockReturnValue({ isLoading: true, data: undefined });

            const { container } = render(<RequestDetailPanel />);

            // Should have skeleton elements (indicated by animate-pulse class)
            const skeletons = container.querySelectorAll('.animate-pulse');
            expect(skeletons.length).toBeGreaterThanOrEqual(1);

            // Should NOT show any actual content tabs while loading
            expect(screen.queryByText('problemDetails')).not.toBeInTheDocument();
            expect(screen.queryByText('analysisDetails')).not.toBeInTheDocument();
        });

        it('renders fallback message when no user prompt is provided', () => {
            mockStore.selectedRequestId = 1;
            const mockData = {
                id: 1,
                status: 'COMPLETED',
                userPrompt: '',
                gptRawResponse: {}
            };
            mockUseQuery.mockReturnValue({ isLoading: false, data: mockData });

            render(<RequestDetailPanel />);
            expect(screen.getByText('noUserPrompt')).toBeInTheDocument();
        });
    });

    describe('Problem details', () => {
        it('renders structured problem details correctly', async () => {
            const user = userEvent.setup();
            mockStore.selectedRequestId = 1;
            const mockData = {
                id: 1,
                status: 'COMPLETED',
                userPrompt: 'Test Prompt',
                stage1Status: 'completed',
                problemDetails: JSON.stringify({
                    title: 'Structured Title',
                    time_limit: '1.0s',
                    memory_limit: '256MB',
                    description: 'Structured Description',
                    input_format: 'Input Format',
                    output_format: 'Output Format',
                    input_sample: '1 2',
                    output_sample: '3',
                    notes: 'Notes'
                }),
                gptRawResponse: {}
            };
            mockUseQuery.mockReturnValue({ isLoading: false, data: mockData });

            render(<RequestDetailPanel />);

            // Click problem tab
            const problemTab = screen.getByText('problemDetails');
            await user.click(problemTab);

            expect(await screen.findByText('Structured Title')).toBeInTheDocument();
            expect(screen.getByText('1.0s')).toBeInTheDocument();
            expect(screen.getByText('Structured Description')).toBeInTheDocument();
        });

        it('renders fallback when problemDetails parsing fails', async () => {
            const user = userEvent.setup();
            mockStore.selectedRequestId = 1;
            const mockData = {
                id: 1,
                status: 'COMPLETED',
                userPrompt: 'Test Prompt',
                stage1Status: 'completed',
                problemDetails: 'Raw String Problem', // Not JSON
                gptRawResponse: {}
            };
            mockUseQuery.mockReturnValue({ isLoading: false, data: mockData });

            render(<RequestDetailPanel />);

            // Click problem tab
            const problemTab = screen.getByText('problemDetails');
            await user.click(problemTab);

            expect(await screen.findByText('Raw String Problem')).toBeInTheDocument();
        });
    });

    describe('Modification analysis', () => {
        it('renders modification analysis with actual code snippets and explanation', async () => {
            const user = userEvent.setup();
            mockStore.selectedRequestId = 1;
            const mockData = {
                id: 1,
                status: 'COMPLETED',
                userPrompt: 'Test Prompt',
                gptRawResponse: {
                    modification_analysis: [
                        {
                            original_snippet: 'let oldVar = 1',
                            modified_snippet: 'const newVar = 1',
                            explanation: 'Replaced let with const for immutability'
                        }
                    ]
                }
            };
            mockUseQuery.mockReturnValue({ isLoading: false, data: mockData });

            render(<RequestDetailPanel />);

            const analysisTab = screen.getByText('analysisDetails');
            await user.click(analysisTab);

            // Verify section labels are rendered
            expect(await screen.findByText('originalSnippet')).toBeInTheDocument();
            expect(screen.getByText('modifiedSnippet')).toBeInTheDocument();

            // Verify actual code snippets are rendered (ShikiCodeRenderer mock renders <pre>{code}</pre>)
            expect(screen.getByText('let oldVar = 1')).toBeInTheDocument();
            expect(screen.getByText('const newVar = 1')).toBeInTheDocument();

            // Verify explanation content is rendered (rendered via react-markdown mock as <div>)
            expect(screen.getByText('Replaced let with const for immutability')).toBeInTheDocument();
        });
    });

    describe('Code diff', () => {
        it('generates diff with correct input and renders it to the DOM', async () => {
            const user = userEvent.setup();
            mockStore.selectedRequestId = 1;

            const originalCode = 'const a = 1;';
            const modifiedCode = 'const a = 2;';

            const mockData = {
                id: 1,
                status: 'COMPLETED',
                userPrompt: 'Test Prompt',
                gptRawResponse: {
                    original_code: originalCode,
                    modified_code: modifiedCode,
                }
            };
            mockUseQuery.mockReturnValue({ isLoading: false, data: mockData });

            render(<RequestDetailPanel />);

            // Click diff tab
            const diffTab = screen.getByText('codeDiff');
            await user.click(diffTab);

            // Verify diff2html was called with a diff string containing the code
            expect(mockDiff2HtmlHtml).toHaveBeenCalled();
            const diffInput = mockDiff2HtmlHtml.mock.calls[0][0];
            // The diff string should contain both original and modified code markers
            expect(diffInput).toContain('const a = 1');
            expect(diffInput).toContain('const a = 2');

            // Verify the mock output is rendered to the DOM
            expect(await screen.findByText('Mock Diff HTML')).toBeInTheDocument();
        });
    });

    describe('Pipeline status', () => {
        it('renders pipeline status even when request is completed', () => {
            mockStore.selectedRequestId = 1;
            const mockData = {
                id: 1,
                status: 'COMPLETED',
                userPrompt: 'Test Prompt',
                stage1Status: 'completed',
                stage2Status: 'completed',
                stage3Status: 'completed',
                problemDetails: '{}',
                gptRawResponse: {}
            };
            mockUseQuery.mockReturnValue({ isLoading: false, data: mockData });

            render(<RequestDetailPanel />);

            // Pipeline status should be visible
            expect(screen.getAllByText('stage1')[0]).toBeInTheDocument();
            expect(screen.getAllByText('stage2')[0]).toBeInTheDocument();
            expect(screen.getAllByText('stage3')[0]).toBeInTheDocument();
        });
    });

    describe('Retry functionality', () => {
        it('handles retry correctly', async () => {
            const user = userEvent.setup();
            mockStore.selectedRequestId = 1;

            const mockData = {
                id: 1,
                status: 'FAILED',
                userPrompt: 'Test Prompt',
                stage1Status: 'failed',
                problemDetails: '{}',
                gptRawResponse: {}
            };
            mockUseQuery.mockReturnValue({ isLoading: false, data: mockData });

            render(<RequestDetailPanel />);

            const retryBtn = screen.getByText('retry');
            await user.click(retryBtn);

            expect(mockRetryMutate).toHaveBeenCalledWith(1);
        });
    });

    describe('Smart polling behavior', () => {
        it('polls frequently when task is active (QUEUED or PROCESSING)', () => {
            mockStore.selectedRequestId = 1;
            mockUseQuery.mockReturnValue({ isLoading: false, data: { status: 'QUEUED' }, error: null });

            render(<RequestDetailPanel />);

            const queryOptions = mockUseQuery.mock.calls[0]?.[1];
            const refetchInterval = queryOptions?.refetchInterval;

            // Should return a short interval (active polling)
            const result = refetchInterval({ state: { data: { status: 'QUEUED' }, error: null } });
            expect(typeof result).toBe('number');
            expect(result).toBeLessThan(10000); // Less than 10 seconds for active tasks
        });

        it('stops polling when task is completed (COMPLETED or FAILED)', () => {
            mockStore.selectedRequestId = 1;
            mockUseQuery.mockReturnValue({ isLoading: false, data: { status: 'COMPLETED' }, error: null });

            render(<RequestDetailPanel />);

            const queryOptions = mockUseQuery.mock.calls[0]?.[1];
            const refetchInterval = queryOptions?.refetchInterval;

            const result = refetchInterval({ state: { data: { status: 'COMPLETED' }, error: null } });
            expect(result).toBe(false); // Polling disabled
        });

        it('stops polling on error (e.g., 404)', () => {
            mockStore.selectedRequestId = 1;
            const mockError = { data: { code: 'NOT_FOUND' } };
            mockUseQuery.mockReturnValue({ isLoading: false, data: null, error: mockError });

            render(<RequestDetailPanel />);

            const queryOptions = mockUseQuery.mock.calls[0]?.[1];
            const refetchInterval = queryOptions?.refetchInterval;

            const result = refetchInterval({ state: { data: null, error: mockError } });
            expect(result).toBe(false); // Polling disabled on error
        });

        it('disables refetch on window blur', () => {
            mockStore.selectedRequestId = 1;
            mockUseQuery.mockReturnValue({ isLoading: false, data: null, error: null });

            render(<RequestDetailPanel />);

            const queryOptions = mockUseQuery.mock.calls[0]?.[1];
            expect(queryOptions?.refetchIntervalInBackground).toBe(false);
        });

        it('prevents infinite retry on 404 errors', () => {
            mockStore.selectedRequestId = 1;
            mockUseQuery.mockReturnValue({ isLoading: false, data: null, error: null });

            render(<RequestDetailPanel />);

            const queryOptions = mockUseQuery.mock.calls[0]?.[1];
            expect(queryOptions?.retry).toBe(false);
        });

        it('only queries when selectedRequestId exists', () => {
            mockStore.selectedRequestId = null;
            mockUseQuery.mockReturnValue({ isLoading: false, data: null, error: null });

            render(<RequestDetailPanel />);

            const queryOptions = mockUseQuery.mock.calls[0]?.[1];
            expect(queryOptions?.enabled).toBe(false);
        });
    });
});
