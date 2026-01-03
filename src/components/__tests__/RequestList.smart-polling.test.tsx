
import { render, act } from '@testing-library/react'
import RequestList from '../RequestList'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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

describe('RequestList Smart Polling & Visibility', () => {
    beforeEach(() => {
        mockUseQuery.mockReset()
        mockInvalidate.mockReset()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('uses 5s polling interval when there are active tasks (QUEUED)', () => {
        const mockData = {
            pages: [[{ id: 1, status: 'QUEUED', createdAt: new Date().toISOString() }]]
        }
        mockUseQuery.mockReturnValue({ isPending: false, data: mockData, isLoading: false })

        render(<RequestList />)

        // Capture the options passed to useInfiniteQuery
        const callArgs = mockUseQuery.mock.calls[0]
        const options = callArgs[1]

        // Execute refetchInterval function
        const interval = options.refetchInterval(mockData)
        expect(interval).toBe(5000)
    })

    it('uses 5s polling interval when there are active tasks (PROCESSING)', () => {
        const mockData = {
            pages: [[{ id: 1, status: 'PROCESSING', createdAt: new Date().toISOString() }]]
        }
        mockUseQuery.mockReturnValue({ isPending: false, data: mockData, isLoading: false })
        render(<RequestList />)
        const interval = mockUseQuery.mock.calls[0][1].refetchInterval(mockData)
        expect(interval).toBe(5000)
    })

    it('uses 30s polling interval when all tasks are completed', () => {
        const mockData = {
            pages: [[{ id: 1, status: 'COMPLETED', createdAt: new Date().toISOString() }]]
        }
        mockUseQuery.mockReturnValue({ isPending: false, data: mockData, isLoading: false })
        render(<RequestList />)
        const interval = mockUseQuery.mock.calls[0][1].refetchInterval(mockData)
        expect(interval).toBe(30000)
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

        // Simulate visibility change
        Object.defineProperty(document, 'hidden', {
            configurable: true,
            get: () => false,
        })
        act(() => {
            const event = new Event('visibilitychange')
            document.dispatchEvent(event)
        })

        expect(mockInvalidate).toHaveBeenCalled()
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
    })
})
