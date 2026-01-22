'use client';

import SubmissionForm from '@/components/SubmissionForm';
import RequestList from '@/components/RequestList';
import RequestDetailPanel from '@/components/RequestDetailPanel';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslations } from 'next-intl';
import { useUIStore } from '@/store/useUIStore';
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, PanelLeft, Sparkles } from "lucide-react";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardProps {
    initialRequestId?: string;
}

export default function Dashboard({ initialRequestId }: DashboardProps) {
    const t = useTranslations('app');
    const { rightPanelMode, createNewRequest, selectRequest } = useUIStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
    const router = useRouter();

    // Sync initialRequestId with store
    useEffect(() => {
        if (initialRequestId) {
            const id = parseInt(initialRequestId, 10);
            if (!isNaN(id)) {
                selectRequest(id);
            }
        } else {
            createNewRequest();
        }
    }, [initialRequestId, selectRequest, createNewRequest]);

    const handleCreateNew = () => {
        createNewRequest();
        router.push('/');
    };

    return (
        <div className="h-screen bg-bg flex flex-col overflow-hidden">
            {/* Navigation Header */}
            <header className="flex-none z-50 w-full border-b bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
                <div className="w-full px-4 sm:px-6 flex h-14 items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Mobile Menu Trigger */}
                        <div className="md:hidden mr-2">
                            <Drawer direction="left" open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                <DrawerTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9">
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                </DrawerTrigger>
                                <DrawerContent className="w-[280px] h-full rounded-none border-r">
                                    <div className="flex flex-col h-full bg-surface">
                                        <div className="p-4 border-b flex items-center gap-2">
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
                                            <span className="font-bold">{t('title')}</span>
                                        </div>
                                        <RequestList />
                                    </div>
                                </DrawerContent>
                            </Drawer>
                        </div>

                        <div className="bg-primary/10 rounded-lg p-2 hidden md:block">
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
                        <h1 className="text-lg font-bold tracking-tight hidden md:block">{t('title')}</h1>

                        {/* Desktop Sidebar Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hidden md:flex h-9 w-9 ml-2"
                            onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
                        >
                            <PanelLeft className="h-5 w-5" />
                        </Button>

                        {/* New Request Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hidden md:flex h-9 w-9"
                            onClick={handleCreateNew}
                            title={t('newRequest')}
                        >
                            <Sparkles className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <LanguageSwitcher />
                            <ThemeSwitcher />
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Desktop Sidebar: Collapsible */}
                <AnimatePresence initial={false} mode="wait">
                    {isDesktopSidebarOpen && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 280, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="hidden md:flex border-r bg-surface flex-col h-full overflow-hidden shrink-0 whitespace-nowrap"
                        >
                            <div className="w-[280px] h-full flex flex-col">
                                <RequestList />
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Main Content: Submission Form or Detail Panel */}
                <section className="flex-1 flex flex-col min-w-0 bg-surface2 relative">
                    <div className="flex-1 p-4 md:p-6 overflow-hidden w-full flex flex-col">
                        {rightPanelMode === 'create' ? (
                            <div className="h-full bg-surface border rounded-lg overflow-hidden flex flex-col">
                                <SubmissionForm />
                            </div>
                        ) : (
                            <div className="h-full flex flex-col overflow-hidden">
                                <RequestDetailPanel />
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
