'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface PageHeaderProps {
    children?: React.ReactNode;
    title?: string;
    showHomeLink?: boolean;
}

export default function PageHeader({ children, title, showHomeLink = true }: PageHeaderProps) {
    const t = useTranslations('app');

    // Default title from translations if not provided
    const displayTitle = title || t('title');

    return (
        <header className="flex-none z-50 w-full border-b bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60 sticky top-0">
            <div className="w-full px-4 sm:px-6 flex h-14 items-center justify-between">
                <div className="flex items-center gap-2">
                    {showHomeLink ? (
                        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <div className="bg-primary/10 rounded-lg p-2">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="w-5 h-5 text-primary"
                                >
                                    <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
                                </svg>
                            </div>
                            <h1 className="text-lg font-bold tracking-tight">{displayTitle}</h1>
                        </Link>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/10 rounded-lg p-2">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="w-5 h-5 text-primary"
                                >
                                    <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
                                </svg>
                            </div>
                            <h1 className="text-lg font-bold tracking-tight">{displayTitle}</h1>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {children}
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <ThemeSwitcher />
                    </div>
                </div>
            </div>
        </header>
    );
}
