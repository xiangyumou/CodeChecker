import { render, screen } from '@testing-library/react'
import ProblemDisplay from '../ProblemDisplay'
import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}))

// NOTE: We do NOT mock react-markdown here anymore. We want to test real rendering.
// However, we mock remark-math/katex if they cause issues in JSDOM or if we just want to verify they are passed.
// For now, let's try to run with them. If JSDOM fails on Katex usage (e.g. strict CSS parsing), we might mock `rehype-katex` but NOT `react-markdown`.

describe('ProblemDisplay', () => {
    const mockData = {
        title: 'Test Problem',
        time_limit: '1s',
        memory_limit: '256MB',
        description: '# Problem description\n\nThis is a **bold** statement.',
        input_format: 'Input format',
        output_format: 'Output format',
        input_sample: '1 2',
        output_sample: '3',
        notes: 'Some notes'
    }

    it('renders full problem data correctly including markdown HTML', () => {
        render(<ProblemDisplay data={mockData} />)

        // Verify title and limits are displayed
        expect(screen.getByText('Test Problem')).toBeInTheDocument()
        expect(screen.getByText('1s')).toBeInTheDocument()
        expect(screen.getByText('256MB')).toBeInTheDocument()

        // Check for section headers (translated keys)
        expect(screen.getByText('problemDescription')).toBeInTheDocument()

        // Verify Markdown Rendering
        // "Problem description" is h1 in markdown
        const h1 = screen.getByRole('heading', { level: 1, name: 'Problem description' })
        expect(h1).toBeInTheDocument()

        // "**bold**" should be strong
        const strong = screen.getByText('bold')
        expect(strong.tagName).toBe('STRONG')
    })

    it('renders simple string content as markdown', () => {
        render(<ProblemDisplay data="**Just a string content**" />)
        const strong = screen.getByText('Just a string content')
        expect(strong.tagName).toBe('STRONG')
    })

    it('renders N/A for missing samples', () => {
        const dataWithNA = { ...mockData, input_sample: 'N/A', output_sample: 'N/A' }
        render(<ProblemDisplay data={dataWithNA} />)

        const pres = screen.getAllByText('none')
        expect(pres.length).toBeGreaterThan(0)
    })

    it('does not render notes section if notes are missing or N/A', () => {
        const dataNoNotes = { ...mockData, notes: 'N/A' }
        render(<ProblemDisplay data={dataNoNotes} />)
        expect(screen.queryByText('notes')).not.toBeInTheDocument()
    })

    it('renders gracefully with null data', () => {
        const { container } = render(<ProblemDisplay data={null as any} />)
        expect(container).toBeEmptyDOMElement()
    })
})
