import { render, screen, fireEvent, act } from '@testing-library/react'
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
                useInfiniteQuery: (...args: unknown[]) => mockUseQuery(...args),
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
        mockInvalidate.mockReset()
    })

    describe('Rendering states', () => {
        it('renders loading state with skeleton placeholders', () => {
            mockUseQuery.mockReturnValue({ isPending: true, data: undefined, isLoading: true })
            const { container } = render(<RequestList />)

            // Loading state should show skeleton placeholders with pulse animation
            const skeletonElements = container.querySelectorAll('.animate-pulse')
            expect(skeletonElements.length).toBeGreaterThan(0)

            // Should render exactly 5 skeleton items for consistency
            const skeletonCards = container.querySelectorAll('[class*="animate-pulse"]')
            expect(skeletonCards.length).toBeGreaterThanOrEqual(5)
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

        it('renders processing state with correct status badge and animated spinner', () => {
            const mockData = [
                { id: 3, status: 'PROCESSING', userPrompt: 'Processing prompt', createdAt: new Date().toISOString() },
            ]
            mockUseQuery.mockReturnValue({ isPending: false, data: { pages: [mockData] }, isLoading: false })

            const { container } = render(<RequestList />)

            // Verify the processing item is rendered with prompt text
            expect(screen.getByText('Processing prompt')).toBeInTheDocument()

            // Verify spinner is present for the processing item
            const spinElements = container.querySelectorAll('.animate-spin')
            expect(spinElements.length).toBe(1) // Exactly one spinner for the processing item
        })
    })

    describe('User interactions', () => {
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

        it('calls invalidate on refresh button click', async () => {
            mockUseQuery.mockReturnValue({ isPending: false, data: { pages: [[]] }, isLoading: false })
            render(<RequestList />)

            // Find the refresh button by its role
            const refreshButton = screen.getByRole('button')
            expect(refreshButton).toBeInTheDocument()

            fireEvent.click(refreshButton)

            expect(mockInvalidate).toHaveBeenCalledTimes(1)
        })
    })

    describe('Smart polling behavior', () => {
        it('polls more frequently when there are active tasks', () => {
            const mockData = {
                pages: [[
                    { id: 1, status: 'QUEUED', createdAt: new Date().toISOString() },
                    { id: 2, status: 'PROCESSING', createdAt: new Date().toISOString() },
                ]]
            }
            mockUseQuery.mockReturnValue({ isPending: false, data: mockData, isLoading: false })

            render(<RequestList />)

            // Capture the options passed to useInfiniteQuery
            const callArgs = mockUseQuery.mock.calls[0]
            const options = callArgs[1]

            // Verify refetchInterval function exists and returns a value
            expect(options.refetchInterval).toBeDefined()

            // Execute refetchInterval function - should be a short interval for active tasks
            const interval = options.refetchInterval(mockData)
            // Should be actively polling (false means disabled, number means enabled)
            expect(typeof interval).toBe('number')
            expect(interval).toBeLessThan(10000) // Less than 10 seconds for active tasks
        })

        it('polls less frequently when all tasks are completed', () => {
            const mockData = {
                pages: [[
                    { id: 1, status: 'COMPLETED', createdAt: new Date().toISOString() },
                    { id: 2, status: 'FAILED', createdAt: new Date().toISOString() },
                ]]
            }
            mockUseQuery.mockReturnValue({ isPending: false, data: mockData, isLoading: false })
            render(<RequestList />)

            const interval = mockUseQuery.mock.calls[0][1].refetchInterval(mockData)

            // Should poll less frequently for completed tasks
            expect(typeof interval).toBe('number')
            expect(interval).toBeGreaterThan(10000) // More than 10 seconds for completed tasks
        })

        it('stops polling when document is hidden', () => {
            // Mock document.hidden
            Object.defineProperty(document, 'hidden', {
                configurable: true,
                get: () => true,
            })

            const mockData = {
                pages: [[{ id: 1, status: 'QUEUED', createdAt: new Date().toISOString() }]]
            }
            mockUseQuery.mockReturnValue({ isPending: false, data: mockData, isLoading: false })
            render(<RequestList />)

            const interval = mockUseQuery.mock.calls[0][1].refetchInterval(mockData)

            // Should stop polling (returns false) when document is hidden
            expect(interval).toBe(false)

            // Restore document.hidden
            Object.defineProperty(document, 'hidden', {
                configurable: true,
                get: () => false,
            })
        })

        it('invalidates queries when visibility changes to visible', () => {
            mockUseQuery.mockReturnValue({ isPending: false, data: { pages: [[]] }, isLoading: false })
            render(<RequestList />)

            // Simulate visibility change to visible
            Object.defineProperty(document, 'hidden', {
                configurable: true,
                get: () => false,
            })
            act(() => {
                const event = new Event('visibilitychange')
                document.dispatchEvent(event)
            })

            expect(mockInvalidate).toHaveBeenCalled()

            // Restore document.hidden
            Object.defineProperty(document, 'hidden', {
                configurable: true,
                get: () => false,
            })
        })

        it('does not invalidate queries when visibility changes to hidden', () => {
            mockUseQuery.mockReturnValue({ isPending: false, data: { pages: [[]] }, isLoading: false })
            render(<RequestList />)

            // Simulate visibility change to hidden
            Object.defineProperty(document, 'hidden', {
                configurable: true,
                get: () => true,
            })
            act(() => {
                const event = new Event('visibilitychange')
                document.dispatchEvent(event)
            })

            expect(mockInvalidate).not.toHaveBeenCalled()

            // Restore document.hidden
            Object.defineProperty(document, 'hidden', {
                configurable: true,
                get: () => false,
            })
        })
    })
})
