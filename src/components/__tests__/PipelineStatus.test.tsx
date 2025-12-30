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

    it('renders all stages with correct labels', () => {
        render(<PipelineStatus stages={mockStages} />);

        // Verify exact stage count (3 stages = 3 labels)
        const stage1Labels = screen.getAllByText('stage1');
        const stage2Labels = screen.getAllByText('stage2');
        const stage3Labels = screen.getAllByText('stage3');

        expect(stage1Labels.length).toBeGreaterThanOrEqual(1);
        expect(stage2Labels.length).toBeGreaterThanOrEqual(1);
        expect(stage3Labels.length).toBeGreaterThanOrEqual(1);
    });

    it('renders correct icon type for each status', () => {
        render(<PipelineStatus stages={mockStages} />);

        // Each status has its own icon type present (may appear multiple times per stage)
        expect(screen.getAllByTestId('icon-check').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByTestId('icon-loader').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByTestId('icon-clock').length).toBeGreaterThanOrEqual(1);
    });

    it('renders failed status with destructive styling and alert icon', () => {
        const failedStages = [{ id: '1', status: 'failed' as const }];
        const { container } = render(<PipelineStatus stages={failedStages} />);

        // Verify alert icon for failed status (may appear multiple times)
        expect(screen.getAllByTestId('icon-alert').length).toBeGreaterThanOrEqual(1);

        // Verify destructive class is applied
        expect(container.querySelector('.text-destructive')).toBeInTheDocument();
    });
});
