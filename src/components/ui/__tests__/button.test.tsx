import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../button'
import { describe, it, expect, vi } from 'vitest'

describe('Button', () => {
    describe('Rendering', () => {
        it('renders correctly with default props', () => {
            render(<Button>Click me</Button>)
            expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
        })

        it('renders with different variants', () => {
            const { rerender } = render(<Button variant="destructive">Destructive</Button>)
            expect(screen.getByRole('button')).toHaveClass('bg-destructive')

            rerender(<Button variant="outline">Outline</Button>)
            expect(screen.getByRole('button')).toHaveClass('border')
        })

        it('renders with different sizes', () => {
            const { rerender } = render(<Button size="sm">Small</Button>)
            expect(screen.getByRole('button')).toHaveAttribute('data-size', 'sm')

            rerender(<Button size="lg">Large</Button>)
            expect(screen.getByRole('button')).toHaveAttribute('data-size', 'lg')

            rerender(<Button size="icon">Icon</Button>)
            expect(screen.getByRole('button')).toHaveAttribute('data-size', 'icon')
        })

        it('sets data-variant attribute correctly', () => {
            const { rerender } = render(<Button variant="ghost">Ghost</Button>)
            expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'ghost')

            rerender(<Button variant="secondary">Secondary</Button>)
            expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'secondary')
        })
    })

    describe('Interactions', () => {
        it('handles click events', () => {
            const handleClick = vi.fn()
            render(<Button onClick={handleClick}>Click me</Button>)
            fireEvent.click(screen.getByRole('button'))
            expect(handleClick).toHaveBeenCalledTimes(1)
        })

        it('can be disabled', () => {
            render(<Button disabled>Disabled</Button>)
            expect(screen.getByRole('button')).toBeDisabled()
        })

        it('does not trigger click when disabled', () => {
            const handleClick = vi.fn()
            render(<Button disabled onClick={handleClick}>Disabled</Button>)
            fireEvent.click(screen.getByRole('button'))
            expect(handleClick).not.toHaveBeenCalled()
        })
    })

    describe('asChild pattern', () => {
        it('renders as child component when asChild is true', () => {
            render(
                <Button asChild>
                    <a href="/test">Link Button</a>
                </Button>
            )
            // Should render as anchor, not button
            const link = screen.getByRole('link', { name: /link button/i })
            expect(link).toBeInTheDocument()
            expect(link).toHaveAttribute('href', '/test')
            // Should not have a button role
            expect(screen.queryByRole('button')).not.toBeInTheDocument()
        })
    })
})
