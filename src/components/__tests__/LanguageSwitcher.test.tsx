import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageSwitcher from '../LanguageSwitcher'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const mockRefresh = vi.fn()
const mockSetLanguage = vi.fn()
let mockCurrentLocale = 'en'

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
    useLocale: () => mockCurrentLocale,
}))

describe('LanguageSwitcher', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockCurrentLocale = 'en'
        // Reset document.cookie
        Object.defineProperty(document, 'cookie', {
            writable: true,
            value: '',
        })
    })

    it('renders correctly with language icon', () => {
        render(<LanguageSwitcher />)
        const button = screen.getByRole('button')
        expect(button).toBeInTheDocument()
        // Should have a screen reader label
        expect(screen.getByText('Switch language')).toBeInTheDocument()
    })

    it('opens dropdown and shows all three languages', async () => {
        const user = userEvent.setup()
        render(<LanguageSwitcher />)
        const button = screen.getByRole('button')
        await user.click(button)

        expect(await screen.findByText('中文')).toBeInTheDocument()
        expect(screen.getByText('English')).toBeInTheDocument()
        expect(screen.getByText('Deutsch')).toBeInTheDocument()
    })

    it('highlights current language with primary styling', async () => {
        mockCurrentLocale = 'zh'
        const user = userEvent.setup()
        render(<LanguageSwitcher />)
        const button = screen.getByRole('button')
        await user.click(button)

        // The current language (Chinese) should have the highlighted class
        const zhOption = await screen.findByText('中文')
        expect(zhOption.closest('[role="menuitem"]')).toHaveClass('bg-primary/10')
        expect(zhOption.closest('[role="menuitem"]')).toHaveClass('text-primary')

        // Other languages should NOT have the highlighted class
        const enOption = screen.getByText('English')
        expect(enOption.closest('[role="menuitem"]')).not.toHaveClass('bg-primary/10')
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

    it('sets locale cookie when language is changed', async () => {
        const user = userEvent.setup()
        render(<LanguageSwitcher />)
        const button = screen.getByRole('button')
        await user.click(button)

        const deOption = await screen.findByText('Deutsch')
        await user.click(deOption)

        // Cookie should be set with the new locale
        expect(document.cookie).toContain('NEXT_LOCALE=de')
    })

    it('correctly calls setLanguage with locale code for each language', async () => {
        const user = userEvent.setup()
        render(<LanguageSwitcher />)

        // Test English
        await user.click(screen.getByRole('button'))
        await user.click(await screen.findByText('English'))
        expect(mockSetLanguage).toHaveBeenCalledWith('en')

        // Test Chinese
        await user.click(screen.getByRole('button'))
        await user.click(await screen.findByText('中文'))
        expect(mockSetLanguage).toHaveBeenCalledWith('zh')

        // Test German
        await user.click(screen.getByRole('button'))
        await user.click(await screen.findByText('Deutsch'))
        expect(mockSetLanguage).toHaveBeenCalledWith('de')
    })
})

