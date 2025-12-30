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

    it('renders loading state with skeleton placeholders', () => {
        mockUseQuery.mockReturnValue({ isPending: true, data: undefined, isLoading: true })
        const { container } = render(<RequestList />)
        const skeletons = container.getElementsByClassName('animate-pulse')
        // Verify reasonable number of skeleton placeholders exist
        expect(skeletons.length).toBeGreaterThanOrEqual(5)
        expect(skeletons.length).toBeLessThanOrEqual(20)
    })

    it('renders empty state', () => {
        mockUseQuery.mockReturnValue({ isPending: false, data: { pages: [[]] }, isLoading: false })
        render(<RequestList />)
        expect(screen.getByText('noHistory')).toBeInTheDocument()
    })

    it('renders list of requests', () => {
        const mockData = [
            { id: 1, status: 'COMPLETED', userPrompt: 'Test prompt 1', createdAt: new Date().toISOString() },
            { id: 2, status: 'QUEUED', userPrompt: 'Test prompt 2', createdAt: new Date().toISOString() },
        ]
        mockUseQuery.mockReturnValue({ isPending: false, data: { pages: [mockData] }, isLoading: false })

        render(<RequestList />)

        expect(screen.getByText('Test prompt 1')).toBeInTheDocument()
        expect(screen.getByText('Test prompt 2')).toBeInTheDocument()
        expect(screen.getByText('completed')).toBeInTheDocument()
        expect(screen.getByText('queued')).toBeInTheDocument()
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

    it('renders processing state with spinning indicator and status text', () => {
        const mockData = [
            { id: 3, status: 'PROCESSING', userPrompt: 'Processing prompt', createdAt: new Date().toISOString() },
        ]
        mockUseQuery.mockReturnValue({ isPending: false, data: { pages: [mockData] }, isLoading: false })

        const { container } = render(<RequestList />)

        // Verify status text is displayed
        expect(screen.getByText('processing')).toBeInTheDocument()

        // Verify spinner exists (at least 1 for the processing item)
        const spinElements = container.getElementsByClassName('animate-spin')
        expect(spinElements.length).toBeGreaterThanOrEqual(1)
    })

    it('calls invalidate on refresh', () => {
        mockUseQuery.mockReturnValue({ isPending: false, data: { pages: [[]] }, isLoading: false })
        render(<RequestList />)
        // Find by icon or specific button
        const buttons = screen.getAllByRole('button')
        // In the updated code, refresh button is accessible. Let's assume it's one of them.
        // Or find by class or other attr. 
        // The empty state has a refresh button.
        fireEvent.click(buttons[0])
        expect(mockInvalidate).toHaveBeenCalled()
    })
})
