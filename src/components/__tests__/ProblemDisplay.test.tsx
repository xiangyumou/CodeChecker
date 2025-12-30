import { render, screen } from '@testing-library/react'
import ProblemDisplay from '../ProblemDisplay'
import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}))

// Mock ReactMarkdown and plugins to avoid ESM issues or complex rendering in tests
vi.mock('react-markdown', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="markdown">{children}</div>
}))

vi.mock('remark-gfm', () => ({ default: () => { } }))
vi.mock('remark-math', () => ({ default: () => { } }))
vi.mock('rehype-katex', () => ({ default: () => { } }))

describe('ProblemDisplay', () => {
    const mockData = {
        title: 'Test Problem',
        time_limit: '1s',
        memory_limit: '256MB',
        description: 'Problem description',
        input_format: 'Input format',
        output_format: 'Output format',
        input_sample: '1 2',
        output_sample: '3',
        notes: 'Some notes'
    }

    it('renders full problem data correctly with expected content', () => {
        render(<ProblemDisplay data={mockData} />)

        // Verify title and limits are displayed
        expect(screen.getByText('Test Problem')).toBeInTheDocument()
        expect(screen.getByText('1s')).toBeInTheDocument()
        expect(screen.getByText('256MB')).toBeInTheDocument()

        // Check for section headers (translated keys)
        expect(screen.getByText('problemDescription')).toBeInTheDocument()
        expect(screen.getByText('inputFormat')).toBeInTheDocument()
        expect(screen.getByText('outputFormat')).toBeInTheDocument()
        expect(screen.getByText('samples')).toBeInTheDocument()
        expect(screen.getByText('notes')).toBeInTheDocument()

        // Verify markdown components receive correct content
        const markdowns = screen.getAllByTestId('markdown')
        // Expect at least 3 markdown sections (description, input, output formats)
        expect(markdowns.length).toBeGreaterThanOrEqual(3)

        // Verify actual content is passed to markdown
        expect(markdowns.some(m => m.textContent === 'Problem description')).toBe(true)
        expect(markdowns.some(m => m.textContent === 'Input format')).toBe(true)
        expect(markdowns.some(m => m.textContent === 'Output format')).toBe(true)
    })

    it('renders simple string content', () => {
        render(<ProblemDisplay data="Just a string content" />)
        expect(screen.getAllByTestId('markdown')[0]).toHaveTextContent('Just a string content')
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
