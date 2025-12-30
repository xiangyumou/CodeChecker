import { render, screen, fireEvent } from '@testing-library/react'
import ThemeSwitcher from '../ThemeSwitcher'
import { describe, it, expect, vi } from 'vitest'

const mockSetTheme = vi.fn()

vi.mock('next-themes', () => ({
    useTheme: () => ({
        theme: 'light',
        setTheme: mockSetTheme,
    }),
}))

describe('ThemeSwitcher', () => {
    it('renders correctly', () => {
        render(<ThemeSwitcher />)
        // Check for "Toggle theme" sr-only text or the button itself
        expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
    })

    it('toggles theme on click', () => {
        render(<ThemeSwitcher />)
        const button = screen.getByRole('button')
        fireEvent.click(button)
        expect(mockSetTheme).toHaveBeenCalledWith('dark')
    })
})
