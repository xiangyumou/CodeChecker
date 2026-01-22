import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SubmissionForm from '../SubmissionForm'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

// Mock dependencies
// Mock dependencies
// import { useRouter } from 'next/navigation' // Unused dep
const mockMutateAsync = vi.fn()
const mockInvalidate = vi.fn()
const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}))
const mockVisionSupport = vi.fn().mockReturnValue('true') // Default: vision enabled

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
            create: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                useMutation: ({ onSuccess }: any) => ({
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    mutateAsync: mockMutateAsync.mockImplementation(async (_data) => {
                        // Simulate success
                        if (onSuccess) onSuccess({ id: 123 });
                        return { id: 123 };
                    }),
                }),
            },
        },
        settings: {
            getByKey: {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                useQuery: (_key: string) => ({
                    data: mockVisionSupport(),
                }),
            },
        },
    },
}))

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}))

// Mock sonner toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
        info: vi.fn(),
    },
}))

vi.mock('../ui/ZoomableImage', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ZoomableImage: ({ src, alt }: any) => <img src={src} alt={alt} />
}))

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: any) => <div {...props}>{children}</div>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        button: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, whileHover: _whileHover, whileTap: _whileTap, ...props }: any) => <button {...props}>{children}</button>,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('SubmissionForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockVisionSupport.mockReturnValue('true') // Reset to enabled for each test
    })

    it('renders correctly', () => {
        render(<SubmissionForm />)
        expect(screen.getByPlaceholderText('unifiedInputPlaceholder')).toBeInTheDocument()
        expect(screen.getByText('submitButton')).toBeInTheDocument()
    })

    it('updates text input', () => {
        render(<SubmissionForm />)
        const textarea = screen.getByPlaceholderText('unifiedInputPlaceholder')
        fireEvent.change(textarea, { target: { value: 'Test prompt' } })
        expect(textarea).toHaveValue('Test prompt')
    })

    it('disables submit button on empty input', () => {
        render(<SubmissionForm />)
        const submitBtn = screen.getByText('submitButton')
        expect(submitBtn).toBeDisabled()
    })

    it('submits form with data', async () => {
        render(<SubmissionForm />)
        const textarea = screen.getByPlaceholderText('unifiedInputPlaceholder')
        fireEvent.change(textarea, { target: { value: 'Valid submission' } })

        const submitBtn = screen.getByText('submitButton')
        fireEvent.click(submitBtn)

        await waitFor(() => {
            expect(mockMutateAsync).toHaveBeenCalledWith({
                userPrompt: 'Valid submission',
                imageReferences: undefined
            })
        })

        expect(mockInvalidate).toHaveBeenCalled()
        expect(mockPush).toHaveBeenCalledWith('/request/123')
    })

    it('handles image upload via input', async () => {
        const user = userEvent.setup()
        const { container } = render(<SubmissionForm />)

        const file = new File(['hello'], 'hello.png', { type: 'image/png' })
        const input = container.querySelector('input[type="file"]')

        await user.upload(input as HTMLElement, file)

        // Wait for preview to appear (mocked ZoomableImage should render something)
        await waitFor(() => {
            expect(screen.getByAltText('preview')).toBeInTheDocument()
        })
        // Verify toast was called with the actual message (Chinese text)
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('张图片'))
    })

    it('removes uploaded image', async () => {
        const user = userEvent.setup()
        const { container } = render(<SubmissionForm />)

        const file = new File(['hello'], 'hello.png', { type: 'image/png' })
        const input = container.querySelector('input[type="file"]')
        await user.upload(input as HTMLElement, file)

        // Wait for preview to appear
        await waitFor(() => {
            expect(screen.getByAltText('preview')).toBeInTheDocument()
        })

        // Find the X button by searching for the icon inside a button
        const xIcon = container.querySelector('.lucide-x')
        const xBtn = xIcon?.closest('button')

        await user.click(xBtn as HTMLElement)

        await waitFor(() => {
            expect(screen.queryByAltText('preview')).not.toBeInTheDocument()
        })
        expect(toast.info).toHaveBeenCalledWith('imageRemoved')
    })

    it('clears form when clear button is clicked', async () => {
        const user = userEvent.setup()
        const { container } = render(<SubmissionForm />)

        const textarea = screen.getByPlaceholderText('unifiedInputPlaceholder')
        await user.type(textarea, 'Some text')

        // Find clear button (Trash2 icon)
        const trashIcon = container.querySelector('.lucide-trash2')
        const clearBtn = trashIcon?.closest('button')

        await user.click(clearBtn as HTMLElement)

        expect(textarea).toHaveValue('')
        expect(toast.info).toHaveBeenCalledWith('formCleared')
    })

    it('handles drag and drop', async () => {
        const { container } = render(<SubmissionForm />)
        const dropZone = container.querySelector('.border-dashed')

        const file = new File(['hello'], 'hello.png', { type: 'image/png' })

        fireEvent.dragOver(dropZone!)
        fireEvent.drop(dropZone!, {
            dataTransfer: {
                files: [file],
                items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
                types: ['Files']
            }
        })

        await waitFor(() => {
            expect(screen.getByAltText('preview')).toBeInTheDocument()
        })
    })

    describe('Vision Support', () => {
        it('shows image upload section when vision is enabled', () => {
            mockVisionSupport.mockReturnValue('true')
            const { container } = render(<SubmissionForm />)

            // Should find file input
            const fileInput = container.querySelector('input[type="file"]')
            expect(fileInput).toBeInTheDocument()

            // Should find drop zone
            const dropZone = container.querySelector('.border-dashed')
            expect(dropZone).toBeInTheDocument()
        })

        it('hides image upload section when vision is disabled', () => {
            mockVisionSupport.mockReturnValue('false')
            const { container } = render(<SubmissionForm />)

            // Should NOT find file input
            const fileInput = container.querySelector('input[type="file"]')
            expect(fileInput).not.toBeInTheDocument()

            // Should NOT find drop zone
            const dropZone = container.querySelector('.border-dashed')
            expect(dropZone).not.toBeInTheDocument()
        })

        it('shows image upload section when vision setting is not set (defaults to enabled)', () => {
            mockVisionSupport.mockReturnValue(null)
            const { container } = render(<SubmissionForm />)

            // Should find file input (default is enabled)
            const fileInput = container.querySelector('input[type="file"]')
            expect(fileInput).toBeInTheDocument()
        })
    })
})
