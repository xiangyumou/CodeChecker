import { expect, test, describe, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatForm } from './chat-form';

// Mock dependencies
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

// Mock Sonner
vi.mock('sonner', () => ({
    toast: { error: vi.fn() },
}));

describe('ChatForm Component', () => {
    test('renders text area and submit button', () => {
        render(<ChatForm />);

        expect(screen.getByPlaceholderText('Paste your code here...')).toBeDefined();
        // Icon button might not have text, check by role or class if needed
        // But getByRole('button') should find something
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
    });
});
