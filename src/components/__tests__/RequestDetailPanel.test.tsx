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
    html: () => '<div>Mock Diff HTML</div>',
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

    it('handles share functionality correctly', async () => {
        const user = userEvent.setup();
        mockStore.selectedRequestId = 1;
        const mockData = {
            id: 1,
            status: 'COMPLETED',
            userPrompt: 'Test Prompt',
            gptRawResponse: {}
        };
        mockUseQuery.mockReturnValue({ isLoading: false, data: mockData });

        // Mock clipboard
        const mockWriteText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: mockWriteText },
            configurable: true
        });

        render(<RequestDetailPanel />);

        // The share button is identified by the Share2 icon path or title
        // In our component, we have title={t('share')}
        const shareBtn = screen.getByTitle('share');
        await user.click(shareBtn);

        expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('/share/1'));
        expect(toast.success).toHaveBeenCalledWith('linkCopied', expect.any(Object));
    });

    it('renders Loading state correctly with skeleton UI', () => {
        mockStore.selectedRequestId = 1;
        mockUseQuery.mockReturnValue({ isLoading: true, data: undefined });

        const { container } = render(<RequestDetailPanel />);
        // Should have skeleton elements (indicated by animate-pulse class)
        const skeletons = container.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);
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
