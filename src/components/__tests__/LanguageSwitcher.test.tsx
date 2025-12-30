import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageSwitcher from '../LanguageSwitcher'
import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
const mockRefresh = vi.fn()
const mockSetLanguage = vi.fn()

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: mockRefresh,
    }),
    usePathname: () => '/current-path',
}))

vi.mock('@/store/useUIStore', () => ({
    useUIStore: () => ({
        setLanguage: mockSetLanguage,
    }),
}))

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
}))

describe('LanguageSwitcher', () => {
    it('renders correctly', () => {
        render(<LanguageSwitcher />)
        expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('opens dropdown and shows languages', async () => {
        const user = userEvent.setup()
        render(<LanguageSwitcher />)
        const button = screen.getByRole('button')
        await user.click(button)

        expect(await screen.findByText('中文')).toBeInTheDocument()
        expect(screen.getByText('English')).toBeInTheDocument()
        expect(screen.getByText('Deutsch')).toBeInTheDocument()
    })

    it('updates store and refreshes router when language is selected', async () => {
        const user = userEvent.setup()
        render(<LanguageSwitcher />)
        const button = screen.getByRole('button')
        await user.click(button)

        const zhOption = await screen.findByText('中文')
        await user.click(zhOption)

        expect(mockSetLanguage).toHaveBeenCalledWith('zh')
        expect(mockRefresh).toHaveBeenCalled()
    })
})
