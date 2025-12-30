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

    it('renders all stages', () => {
        render(<PipelineStatus stages={mockStages} />);

        expect(screen.getAllByText('stage1').length).toBeGreaterThan(0);
        expect(screen.getAllByText('stage2').length).toBeGreaterThan(0);
        expect(screen.getAllByText('stage3').length).toBeGreaterThan(0);
    });

    it('renders correct icons for each status', () => {
        render(<PipelineStatus stages={mockStages} />);

        expect(screen.getAllByTestId('icon-check').length).toBeGreaterThan(0);
        expect(screen.getAllByTestId('icon-loader').length).toBeGreaterThan(0);
        expect(screen.getAllByTestId('icon-clock').length).toBeGreaterThan(0);
    });

    it('renders failed status correctly', () => {
        const failedStages = [{ id: '1', status: 'failed' as const }];
        const { container } = render(<PipelineStatus stages={failedStages} />);

        expect(screen.getAllByTestId('icon-alert').length).toBeGreaterThan(0);
        expect(container.querySelector('.text-destructive')).toBeInTheDocument();
    });
});
