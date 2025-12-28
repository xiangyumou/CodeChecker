import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from './page'

// Mock dependencies for ChatForm
vi.mock('@ai-sdk/react', () => ({
    useChat: () => ({
        messages: [],
        input: '',
        handleInputChange: vi.fn(),
        handleSubmit: vi.fn((e) => e.preventDefault()),
        isLoading: false,
        stop: vi.fn(),
        error: null,
    }),
}));

vi.mock('sonner', () => ({
    toast: { error: vi.fn() },
}));

test('Page', () => {
    render(<Page />)
    // Check that ChatForm is rendered (e.g. by title)
    expect(screen.getByText('AI Code Refactoring')).toBeDefined()
})
