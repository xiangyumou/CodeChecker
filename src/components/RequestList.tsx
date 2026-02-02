'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/utils/trpc';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS, de } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { RefreshCw, Eye, Clock, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { useUIStore } from '@/store/useUIStore';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBadge from './StatusBadge';
import { useRequestListPolling } from '@/hooks/useSmartPolling';
import { EmptyState } from '@/components/ui/empty-state';

const STALE_TIME = 30 * 1000;
const GC_TIME = 10 * 60 * 1000;
const PAGE_SIZE = 20;
const REFRESH_ANIMATION_DELAY = 500;

const localeMap = {
    zh: zhCN,
    en: enUS,
    de: de,
};

export default function RequestList() {
    const t = useTranslations('requestList');
    const locale = useLocale() as 'zh' | 'en' | 'de';
    const utils = trpc.useUtils();
    const router = useRouter();
    const [isRefetching, setIsRefetching] = useState(false);
    const { ref, inView } = useInView();
    const { selectedRequestId } = useUIStore();
    const listPolling = useRequestListPolling();

    const {
        data: infiniteData,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = trpc.requests.list.useInfiniteQuery(
        { take: PAGE_SIZE },
        {
            getNextPageParam: (lastPage: unknown[]) => {
                if (lastPage.length < PAGE_SIZE) return undefined;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (lastPage[lastPage.length - 1] as any).id;
            },

            // Smart polling: dual-speed strategy
            refetchInterval: listPolling,

            // Cache configuration to prevent skeleton flashing
            staleTime: STALE_TIME,

            // Keep cached data
            gcTime: GC_TIME,

            // Don't refetch on mount if we have cached data
            refetchOnMount: false,

            // Refetch when window regains focus
            refetchOnWindowFocus: true,

            // Refetch on network reconnection
            refetchOnReconnect: true,

            // Don't poll in background
            refetchIntervalInBackground: false,
        }
    );

    const requests = infiniteData?.pages.flat() || [];

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Page Visibility API: Refresh immediately when user returns to the page
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                // Page is now visible, trigger immediate refresh
                utils.requests.list.invalidate();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [utils]);

    const handleRefresh = async () => {
        setIsRefetching(true);
        await utils.requests.list.invalidate();
        setTimeout(() => setIsRefetching(false), REFRESH_ANIMATION_DELAY);
    };

    if (isLoading && !infiniteData) {
        return (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b bg-surface2">
                    <Skeleton className="h-6 w-32" />
                </div>
                <div className="p-3 space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-16 rounded-full" />
                            </div>
                            <Skeleton className="h-3 w-3/4" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center p-4 border-b bg-surface2">
                    <h2 className="text-sm font-bold text-muted-foreground">{t('title')}</h2>
                    <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefetching} className="h-8 w-8 text-muted-foreground">
                        <RefreshCw className={cn("w-3.5 h-3.5", isRefetching && "animate-spin")} />
                    </Button>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <EmptyState
                        icon={Sparkles}
                        title={t('noHistory')}
                        description={t('submitToSeeHere')}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-surface2 min-h-0">
            <div className="flex justify-between items-center px-4 py-3 bg-surface2/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-muted-foreground">{t('title')}</h2>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefetching}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary transition-colors"
                    title={t('refreshTooltip')}
                >
                    <RefreshCw className={cn("w-3.5 h-3.5", isRefetching && "animate-spin")} />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
                <motion.div
                    className="p-3 space-y-3"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: {
                            transition: {
                                staggerChildren: 0.05,
                            },
                        },
                    }}
                >
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {requests.map((request: any) => {
                        const isSelected = selectedRequestId === request.id;

                        return (
                            <motion.div
                                key={request.id}
                                className={cn(
                                    "group relative bg-card border rounded-lg p-4 transition-all duration-200 cursor-pointer overflow-hidden shadow-none",
                                    isSelected
                                        ? "border-l-[3px] border-l-primary bg-surface2 border-y-border border-r-border pl-[13px]"
                                        : "border-border hover:border-primary/50"
                                )}
                                onClick={() => router.push(`/request/${request.id}`)}
                                variants={{
                                    hidden: { opacity: 0, y: 5 },
                                    visible: { opacity: 1, y: 0 },
                                }}
                                transition={{
                                    duration: 0.2,
                                    ease: "easeOut",
                                }}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.99 }}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-sm font-semibold truncate block">
                                                {t('itemTitle', { id: request.id })}
                                            </span>
                                        </div>
                                        <StatusBadge
                                            status={request.status}
                                            stage1Status={request.stage1Status}
                                            stage2Status={request.stage2Status}
                                            stage3Status={request.stage3Status}
                                        />
                                    </div>

                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                        {request.userPrompt || t('noPromptContent')}
                                    </p>

                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center text-[10px] text-muted-foreground/80">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {formatDistanceToNow(new Date(request.createdAt), {
                                                addSuffix: true,
                                                locale: localeMap[locale],
                                            })}
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Eye className="w-3.5 h-3.5 text-primary/70" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}

                    {/* Sentinel for infinite scrolling */}
                    <div ref={ref} className="h-4 w-full" />

                    <AnimatePresence>
                        {isFetchingNextPage && (
                            <motion.div
                                className="p-4 flex justify-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}
