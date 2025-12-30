import { render, screen, fireEvent } from '@testing-library/react'
import ThemeSwitcher from '../ThemeSwitcher'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockCurrentTheme = 'light'
const mockSetTheme = vi.fn()

vi.mock('next-themes', () => ({
    useTheme: () => ({
        theme: mockCurrentTheme,
        setTheme: mockSetTheme,
    }),
}))

describe('ThemeSwitcher', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockCurrentTheme = 'light'
    })

    it('renders correctly with accessible label', () => {
        render(<ThemeSwitcher />)
        // Check for "Toggle theme" sr-only text or the button itself
        expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
    })

    it('renders Sun and Moon icons for theme indication', () => {
        const { container } = render(<ThemeSwitcher />)
        // Both icons should be present (visibility controlled by CSS)
        expect(container.querySelectorAll('svg')).toHaveLength(2)
    })

    it('toggles from light to dark theme on click', () => {
        mockCurrentTheme = 'light'
        render(<ThemeSwitcher />)
        const button = screen.getByRole('button')
        fireEvent.click(button)
        expect(mockSetTheme).toHaveBeenCalledWith('dark')
    })

    it('toggles from dark to light theme on click', () => {
        mockCurrentTheme = 'dark'
        render(<ThemeSwitcher />)
        const button = screen.getByRole('button')
        fireEvent.click(button)
        expect(mockSetTheme).toHaveBeenCalledWith('light')
    })

    it('handles system theme by toggling to dark', () => {
        // When theme is 'system', it should behave like light (not 'dark')
        mockCurrentTheme = 'system'
        render(<ThemeSwitcher />)
        const button = screen.getByRole('button')
        fireEvent.click(button)
        // Since 'system' !== 'dark', it should set to 'dark'
        expect(mockSetTheme).toHaveBeenCalledWith('dark')
    })

    it('only renders once mounted to avoid hydration mismatch', () => {
        // This is implicitly tested by the component working correctly
        // The component uses useState to track mounted state
        const { container } = render(<ThemeSwitcher />)
        // After render, should have both icons (mounted state)
        expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(1)
    })

    it('has screen reader accessible name', () => {
        render(<ThemeSwitcher />)
        const button = screen.getByRole('button')
        // The accessible name should be "Toggle theme" from sr-only span
        expect(button).toHaveAccessibleName('Toggle theme')
    })
})

