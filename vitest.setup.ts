import { vi, beforeAll } from 'vitest'
import '@testing-library/jest-dom'

// Add DOCTYPE to prevent KaTeX quirks mode warning
beforeAll(() => {
    if (typeof document !== 'undefined' && !document.doctype) {
        const doctype = document.implementation.createDocumentType(
            'html',
            '',
            ''
        );
        document.insertBefore(doctype, document.documentElement);
    }
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
} as unknown as typeof ResizeObserver;

// Mock window.alert
if (typeof window !== 'undefined' && !window.alert) {
    window.alert = vi.fn();
}

// Mock window.scrollTo
if (typeof window !== 'undefined') {
    window.scrollTo = vi.fn();
}
