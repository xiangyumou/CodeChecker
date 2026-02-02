import { render, screen, waitFor } from '@testing-library/react';
import ShikiCodeRenderer from '../ShikiCodeRenderer';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockHighlighter = {
    codeToHtml: vi.fn((code) => `<pre><code>${code}</code></pre>`),
};

vi.mock('shiki', () => ({
    createHighlighter: vi.fn(() => Promise.resolve(mockHighlighter)),
}));

const mockUseTheme = vi.fn();
vi.mock('next-themes', () => ({
    useTheme: () => mockUseTheme(),
}));

describe('ShikiCodeRenderer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseTheme.mockReturnValue({ theme: 'dark', systemTheme: 'dark' });
    });

    it('renders skeleton initially', async () => {
        const { container } = render(<ShikiCodeRenderer code="const x = 1;" />);
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
        // Wait for it to finish to avoid act warning in subsequent tests or on unmount
        await waitFor(() => {
            expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
        });
    });

    it('renders highlighted code after loading', async () => {
        render(<ShikiCodeRenderer code="const x = 1;" />);
        await waitFor(() => {
            expect(screen.getByText('const x = 1;')).toBeInTheDocument();
        });
        expect(mockHighlighter.codeToHtml).toHaveBeenCalled();
    });

    it('handles theme changes by re-highlighting with new theme', async () => {
        const { rerender } = render(<ShikiCodeRenderer code="test" />);
        await waitFor(() => expect(screen.getByText('test')).toBeInTheDocument());

        mockUseTheme.mockReturnValue({ theme: 'light', systemTheme: 'light' });
        rerender(<ShikiCodeRenderer code="test" />);

        await waitFor(() => {
            expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith('test', expect.objectContaining({
                theme: 'github-light'
            }));
        });
    });

    it('handles highlighter error gracefully by stopping loading and rendering empty', async () => {
        vi.mocked(mockHighlighter.codeToHtml).mockImplementationOnce(() => {
            throw new Error('shiki error');
        });

        const { container } = render(<ShikiCodeRenderer code="test code" className="test-class" />);

        // First verify we start with skeleton (loading state)
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();

        await waitFor(() => {
            // After error, skeleton should be gone (loading stopped)
            expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
        });

        // Component should render (not crash) with a div - but html will be empty
        const renderedDiv = container.querySelector('.test-class');
        expect(renderedDiv).toBeInTheDocument();
        // On error, the html state is empty, so the inner div's innerHTML should be empty
        expect(renderedDiv!.querySelector('.p-4')!.innerHTML).toBe('');
    });
});
