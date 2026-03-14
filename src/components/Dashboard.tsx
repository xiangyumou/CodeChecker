'use client';

import SubmissionForm from '@/components/SubmissionForm';
import RequestList from '@/components/RequestList';
import RequestDetailPanel from '@/components/RequestDetailPanel';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import Logo from '@/components/Logo';
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, PanelLeft, Sparkles } from "lucide-react";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardProps {
    initialRequestId?: string;
}

export default function Dashboard({ initialRequestId }: DashboardProps) {
    const parsedId = initialRequestId ? parseInt(initialRequestId, 10) : null;
    const validId = parsedId && !isNaN(parsedId) ? parsedId : null;

    const [rightPanelMode, setRightPanelMode] = useState<'create' | 'detail'>(validId ? 'detail' : 'create');
    const [selectedRequestId, setSelectedRequestId] = useState<number | null>(validId);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
    const router = useRouter();

    const handleCreateNew = () => {
        setSelectedRequestId(null);
        setRightPanelMode('create');
        router.push('/');
    };

    const handleSelectRequest = (id: number) => {
        setSelectedRequestId(id);
        setRightPanelMode('detail');
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
                                            <div className="bg-primary-a10 rounded-lg p-2">
                                                <Logo />
                                            </div>
                                            <span className="font-bold">Code Checker</span>
                                        </div>
                                        <RequestList
                                            selectedRequestId={selectedRequestId}
                                            onSelectRequest={handleSelectRequest}
                                        />
                                    </div>
                                </DrawerContent>
                            </Drawer>
                        </div>

                        <div className="bg-primary-a10 rounded-lg p-2 hidden md:block">
                            <Logo />
                        </div>
                        <h2 className="font-bold hidden md:block">Code Checker</h2>

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
                            title="新建请求"
                        >
                            <Sparkles className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeSwitcher />
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
                                <RequestList
                                    selectedRequestId={selectedRequestId}
                                    onSelectRequest={handleSelectRequest}
                                />
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Main Content: Submission Form or Detail Panel */}
                <section className="flex-1 flex flex-col min-w-0 bg-surface2 relative">
                    <div className="flex-1 p-4 md:p-6 overflow-hidden w-full flex flex-col">
                        {rightPanelMode === 'create' ? (
                            <div className="h-full bg-card border rounded-xl overflow-hidden flex flex-col">
                                <SubmissionForm />
                            </div>
                        ) : (
                            <div className="h-full flex flex-col overflow-hidden">
                                <RequestDetailPanel requestId={selectedRequestId} />
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
