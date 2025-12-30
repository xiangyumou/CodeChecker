'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/utils/trpc';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS, de } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { RefreshCw, Eye, Clock, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { useUIStore } from '@/store/useUIStore';
import { motion, AnimatePresence } from 'framer-motion';

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
    const { selectRequest, selectedRequestId } = useUIStore();

    const {
        data: infiniteData,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = trpc.requests.list.useInfiniteQuery(
        { take: 20 },
        {
            getNextPageParam: (lastPage: any[]) => {
                if (lastPage.length < 20) return undefined;
                return lastPage[lastPage.length - 1].id;
            },
            refetchInterval: 5000,
        }
    );

    const requests = infiniteData?.pages.flat() || [];

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const statusConfig = {
        QUEUED: { color: 'bg-muted text-muted-foreground', icon: Clock, iconClass: '' },
        PROCESSING: { color: 'bg-blue-500/10 text-blue-500', icon: Loader2, iconClass: 'animate-spin' },
        COMPLETED: { color: 'bg-green-500/10 text-green-500', icon: CheckCircle2, iconClass: '' },
        FAILED: { color: 'bg-destructive/10 text-destructive', icon: AlertCircle, iconClass: '' },
    } as const;

    const handleRefresh = async () => {
        setIsRefetching(true);
        await utils.requests.list.invalidate();
        setTimeout(() => setIsRefetching(false), 500); // Visual delay for better feel
    };

    if (isLoading && !infiniteData) {
        return (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b bg-muted/5">
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
                <div className="flex justify-between items-center p-4 border-b bg-muted/5">
                    <h2 className="text-base font-semibold tracking-tight">{t('title')}</h2>
                    <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefetching} className="h-8 w-8 text-muted-foreground">
                        <RefreshCw className={cn("w-3.5 h-3.5", isRefetching && "animate-spin")} />
                    </Button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="bg-primary/5 rounded-full p-6 ring-1 ring-primary/10">
                        <Sparkles className="w-8 h-8 text-primary/60" />
                    </div>
                    <div className="space-y-1 max-w-[200px]">
                        <p className="text-sm font-medium">{t('noHistory')}</p>
                        <p className="text-xs text-muted-foreground">
                            {t('submitToSeeHere')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-muted/5 min-h-0">
            <div className="flex justify-between items-center px-4 py-3 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('title')}</h2>
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
                    {requests.map((request: any) => {
                        const config = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.QUEUED;
                        const StatusIcon = config.icon;
                        const isSelected = selectedRequestId === request.id;

                        return (
                            <motion.div
                                key={request.id}
                                className={cn(
                                    "group relative bg-card border rounded-lg p-4 transition-all duration-200 cursor-pointer",
                                    isSelected
                                        ? "border-primary ring-1 ring-primary shadow-md bg-primary/5"
                                        : "border-border hover:border-primary"
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
                                        <Badge variant="secondary" className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium border-0 opacity-80", config.color)}>
                                            <StatusIcon className={cn("w-3 h-3 mr-1", config.iconClass)} />
                                            {t(request.status.toLowerCase())}
                                        </Badge>
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
