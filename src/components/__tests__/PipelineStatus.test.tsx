import { render, screen } from '@testing-library/react';
import PipelineStatus from '../PipelineStatus';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock('lucide-react', () => ({
    Check: () => <div data-testid="icon-check" />,
    Loader2: () => <div data-testid="icon-loader" />,
    Clock: () => <div data-testid="icon-clock" />,
    AlertCircle: () => <div data-testid="icon-alert" />,
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

describe('PipelineStatus', () => {
    const mockStages = [
        { id: '1', status: 'completed' as const },
        { id: '2', status: 'processing' as const },
        { id: '3', status: 'pending' as const },
    ];

    it('renders exactly 3 stages with correct labels for a 3-stage pipeline', () => {
        render(<PipelineStatus stages={mockStages} />);

        // Each stage label appears twice: once in desktop view, once in mobile view
        // So 3 stages * 2 views = 6 stage labels total
        expect(screen.getAllByText('stage1')).toHaveLength(2);
        expect(screen.getAllByText('stage2')).toHaveLength(2);
        expect(screen.getAllByText('stage3')).toHaveLength(2);
    });

    it('renders correct icon for each status type', () => {
        render(<PipelineStatus stages={mockStages} />);

        // With 3 stages across 2 views (desktop + mobile), we get 6 stage indicators total
        // Stage 1 (completed) -> check icon x2
        // Stage 2 (processing) -> loader icon x2
        // Stage 3 (pending) -> clock icon x2
        expect(screen.getAllByTestId('icon-check')).toHaveLength(2);
        expect(screen.getAllByTestId('icon-loader')).toHaveLength(2);
        expect(screen.getAllByTestId('icon-clock')).toHaveLength(2);
    });

    it('renders failed status with alert icon and destructive styling', () => {
        const failedStages = [{ id: '1', status: 'failed' as const }];
        const { container } = render(<PipelineStatus stages={failedStages} />);

        // Should show alert icon (2 times for desktop + mobile views)
        expect(screen.getAllByTestId('icon-alert')).toHaveLength(2);

        // Should NOT show other icons
        expect(screen.queryByTestId('icon-check')).not.toBeInTheDocument();
        expect(screen.queryByTestId('icon-loader')).not.toBeInTheDocument();
        expect(screen.queryByTestId('icon-clock')).not.toBeInTheDocument();

        // Verify destructive class is applied to the status indicator
        expect(container.querySelector('.text-destructive')).toBeInTheDocument();
    });
});
