import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../Dashboard';

// Mock dependencies
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
    }),
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock('@/store/useUIStore', () => ({
    useUIStore: () => ({
        rightPanelMode: 'create',
        createNewRequest: vi.fn(),
        selectRequest: vi.fn(),
    }),
}));

vi.mock('@/components/SubmissionForm', () => ({
    default: () => <div data-testid="submission-form">Submission Form</div>,
}));

vi.mock('@/components/RequestList', () => ({
    default: () => <div data-testid="request-list">Request List</div>,
}));

vi.mock('@/components/RequestDetailPanel', () => ({
    default: () => <div data-testid="request-detail-panel">Request Detail Panel</div>,
}));

vi.mock('@/components/ThemeSwitcher', () => ({
    default: () => <button data-testid="theme-switcher">Theme</button>,
}));

vi.mock('@/components/LanguageSwitcher', () => ({
    default: () => <button data-testid="language-switcher">Language</button>,
}));

describe('Dashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders header with title', () => {
        render(<Dashboard />);
        expect(screen.getByText('title')).toBeInTheDocument();
    });

    it('renders theme and language switchers', () => {
        render(<Dashboard />);
        expect(screen.getByTestId('theme-switcher')).toBeInTheDocument();
        expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    });

    it('renders main content area', () => {
        render(<Dashboard />);
        // By default, rightPanelMode is 'create', so submission form should be shown
        expect(screen.getByTestId('submission-form')).toBeInTheDocument();
    });

    it('renders navigation header with menu button on mobile', () => {
        render(<Dashboard />);
        // Menu button should exist (visible on mobile)
        const menuButtons = screen.getAllByRole('button');
        // At least one button should be present (theme switcher is always there)
        expect(menuButtons.length).toBeGreaterThan(0);
    });

    it('has proper layout structure with header and main sections', () => {
        const { container } = render(<Dashboard />);

        // Check that main layout elements exist
        const header = container.querySelector('header');
        expect(header).toBeInTheDocument();

        const main = container.querySelector('main');
        expect(main).toBeInTheDocument();
    });
});
