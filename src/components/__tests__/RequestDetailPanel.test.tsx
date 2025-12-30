import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestDetailPanel from '../RequestDetailPanel';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

// Mock dependencies
const mockUseQuery = vi.fn();
const mockCreateNewRequest = vi.fn();
const mockRetryMutate = vi.fn();

vi.mock('@/utils/trpc', () => ({
    trpc: {
        useUtils: () => ({
            requests: {
                getById: { invalidate: vi.fn() },
                list: { invalidate: vi.fn() },
            },
        }),
        requests: {
            getById: {
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

// Mock diff2html
vi.mock('diff2html', () => ({
    html: vi.fn(() => '<div>Mock Diff HTML</div>'),
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
        // Default safe return
        mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });
        mockStore.selectedRequestId = null;
    });

    it('renders empty state when no request selected', () => {
        render(<RequestDetailPanel />);
        expect(screen.getByText('selectRequestToView')).toBeInTheDocument();
    });

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

    it('renders modification analysis correctly', async () => {
        const user = userEvent.setup();
        mockStore.selectedRequestId = 1;
        const mockData = {
            id: 1,
            status: 'COMPLETED',
            userPrompt: 'Test Prompt',
            gptRawResponse: {
                modification_analysis: [
                    {
                        original_snippet: 'old code',
                        modified_snippet: 'new code',
                        explanation: 'did something'
                    }
                ]
            }
        };
        mockUseQuery.mockReturnValue({ isLoading: false, data: mockData });

        render(<RequestDetailPanel />);

        const analysisTab = screen.getByText('analysisDetails');
        await user.click(analysisTab);

        expect(await screen.findByText('originalSnippet')).toBeInTheDocument();
        expect(screen.getByText('did something')).toBeInTheDocument();

        // Verify diff2html was NOT called here (this is analysis tab)
        // But we should verify it IS called in the diff tab if we had verified that tab.
        // Let's create a specific test for diff2html argument verification or add it here if applicable.
        // The implementation computes diffHtml in useMemo when request.gptRawResponse exists.
        // The mockData in this test does NOT have .modified_code, so useMemo returns null.
    });

    it('generates diff and renders it to the DOM', async () => {
        const user = userEvent.setup();
        mockStore.selectedRequestId = 1;

        const mockData = {
            id: 1,
            status: 'COMPLETED',
            userPrompt: 'Test Prompt',
            gptRawResponse: {
                original_code: 'const a = 1;',
                modified_code: 'const a = 2;',
            }
        };
        mockUseQuery.mockReturnValue({ isLoading: false, data: mockData });

        render(<RequestDetailPanel />);

        // Click diff tab
        const diffTab = screen.getByText('codeDiff');
        await user.click(diffTab);

        // Instead of spying on the library, we check if the mock output is rendered
        // In a real integration test without mocks, we would check for specific diff classes like .d2h-ins
        // Since we are mocking diff2html in this file (lines 53-55), we rely on that mock's output.
        // The mock returns '<div>Mock Diff HTML</div>'.

        expect(await screen.findByText('Mock Diff HTML')).toBeInTheDocument();

        // This test proves the component calls the diff generator and puts the result in the DOM.
        // It does NOT lock us into passing specific options 'side-by-side' etc.
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
