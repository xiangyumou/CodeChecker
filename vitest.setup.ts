import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi, beforeAll } from 'vitest'

// Runs a cleanup after each test case
afterEach(() => {
    cleanup()
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
} as any;

// Mock window.alert
if (typeof window !== 'undefined' && !window.alert) {
    window.alert = vi.fn();
}

// Mock window.scrollTo
if (typeof window !== 'undefined') {
    window.scrollTo = vi.fn();
}
