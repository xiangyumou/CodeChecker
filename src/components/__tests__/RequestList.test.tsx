import { render, screen, fireEvent } from '@testing-library/react'
import RequestList from '../RequestList'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const mockInvalidate = vi.fn()
const mockUseQuery = vi.fn()
const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}))

vi.mock('@/utils/trpc', () => ({
    trpc: {
        useUtils: () => ({
            requests: {
                list: {
                    invalidate: mockInvalidate,
                },
            },
        }),
        requests: {
            list: {
                useInfiniteQuery: (...args: any[]) => mockUseQuery(...args),
            },
        },
    },
}))

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => 'en',
}))

vi.mock('@/store/useUIStore', () => ({
    useUIStore: () => ({
        selectRequest: vi.fn(),
        selectedRequestId: 1,
    }),
}))

describe('RequestList', () => {
    beforeEach(() => {
        mockUseQuery.mockReset()
        mockPush.mockReset()
    })

    it('renders loading state with exactly 5 skeleton items', () => {
        mockUseQuery.mockReturnValue({ isPending: true, data: undefined, isLoading: true })
        const { container } = render(<RequestList />)
        // The component renders exactly 5 skeleton items in loading state
        const skeletonCards = container.querySelectorAll('.rounded-xl.border')
        expect(skeletonCards).toHaveLength(5)
    })

    it('renders empty state', () => {
        mockUseQuery.mockReturnValue({ isPending: false, data: { pages: [[]] }, isLoading: false })
        render(<RequestList />)
        expect(screen.getByText('noHistory')).toBeInTheDocument()
    })

    it('renders list of requests with correct content and statuses', () => {
        const mockData = [
            { id: 1, status: 'COMPLETED', userPrompt: 'Test prompt 1', createdAt: new Date().toISOString() },
            { id: 2, status: 'QUEUED', userPrompt: 'Test prompt 2', createdAt: new Date().toISOString() },
        ]
        mockUseQuery.mockReturnValue({ isPending: false, data: { pages: [mockData] }, isLoading: false })

        render(<RequestList />)

        // Verify exact content is rendered
        expect(screen.getByText('Test prompt 1')).toBeInTheDocument()
        expect(screen.getByText('Test prompt 2')).toBeInTheDocument()
        // Verify correct status badges are shown
        expect(screen.getByText('completed')).toBeInTheDocument()
        expect(screen.getByText('queued')).toBeInTheDocument()
        // Verify the number of request items matches the data
        const requestItems = screen.getAllByText(/Test prompt/)
        expect(requestItems).toHaveLength(2)
    })

    it('navigates to request details on click', () => {
        const mockData = [
            { id: 123, status: 'COMPLETED', userPrompt: 'Click me', createdAt: new Date().toISOString() },
        ]
        mockUseQuery.mockReturnValue({ isPending: false, data: { pages: [mockData] }, isLoading: false })

        render(<RequestList />)

        const item = screen.getByText('Click me').closest('div[class*="group relative"]')
        fireEvent.click(item!)

        expect(mockPush).toHaveBeenCalledWith('/request/123')
    })

    it('renders processing state with correct status badge and animated spinner', () => {
        const mockData = [
            { id: 3, status: 'PROCESSING', userPrompt: 'Processing prompt', createdAt: new Date().toISOString() },
        ]
        mockUseQuery.mockReturnValue({ isPending: false, data: { pages: [mockData] }, isLoading: false })

        const { container } = render(<RequestList />)

        // Verify status text is displayed in a badge
        const statusBadge = screen.getByText('processing')
        expect(statusBadge).toBeInTheDocument()
        expect(statusBadge.closest('[class*="bg-blue"]')).toBeInTheDocument()

        // Verify spinner is associated with the processing item
        const spinElements = container.querySelectorAll('.animate-spin')
        expect(spinElements.length).toBe(1) // Exactly one spinner for the processing item
    })

    it('calls invalidate on refresh button click', async () => {
        mockUseQuery.mockReturnValue({ isPending: false, data: { pages: [[]] }, isLoading: false })
        render(<RequestList />)

        // Find the refresh button by its title attribute which is set to 'refreshTooltip'
        const refreshButton = screen.getByRole('button')
        expect(refreshButton).toBeInTheDocument()

        fireEvent.click(refreshButton)

        expect(mockInvalidate).toHaveBeenCalledTimes(1)
    })
})
