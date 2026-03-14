'use client';

import { useRouter } from 'next/navigation';
import { listRequests, RequestListItem } from '@/app/actions/requests';
import { translate } from '@/lib/i18n';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { RefreshCw, Eye, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import StatusBadge from './StatusBadge';
import { EmptyState } from '@/components/ui/empty-state';

interface RequestListProps {
    selectedRequestId: number | null;
    onSelectRequest: (id: number) => void;
}

export default function RequestList({ selectedRequestId, onSelectRequest }: RequestListProps) {
    const router = useRouter();
    const [requests, setRequests] = useState<RequestListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);

    const loadRequests = useCallback(async () => {
        try {
            const data = await listRequests({ limit: 100 });
            setRequests(data);
        } catch (error) {
            console.error('Failed to load requests:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRequests();

        // 固定 5 秒轮询
        const interval = setInterval(loadRequests, 5000);
        return () => clearInterval(interval);
    }, [loadRequests]);

    const handleRefresh = async () => {
        setIsRefetching(true);
        await loadRequests();
        setTimeout(() => setIsRefetching(false), 500);
    };

    const handleSelect = (id: number) => {
        onSelectRequest(id);
        router.push(`/request/${id}`);
    };

    if (isLoading) {
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
                    <h2 className="text-sm font-bold text-muted-foreground">{translate('requestList.title')}</h2>
                    <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefetching} className="h-8 w-8 text-muted-foreground">
                        <RefreshCw className={cn("w-3.5 h-3.5", isRefetching && "animate-spin")} />
                    </Button>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <EmptyState
                        icon={Sparkles}
                        title={translate('requestList.noHistory')}
                        description={translate('requestList.submitToSeeHere')}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-surface2 min-h-0">
            <div className="flex justify-between items-center px-4 py-3 bg-surface2/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-muted-foreground">{translate('requestList.title')}</h2>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefetching}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary transition-colors"
                    title={translate('requestList.refreshTooltip')}
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
                    {requests.map((request) => {
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
                                onClick={() => handleSelect(request.id)}
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
                                                {translate('requestList.itemTitle', { id: request.id })}
                                            </span>
                                        </div>
                                        <StatusBadge status={request.status} />
                                    </div>

                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                        {request.userPrompt || translate('requestList.noPromptContent')}
                                    </p>

                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center text-[10px] text-muted-foreground/80">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {request.createdAt && formatDistanceToNow(new Date(request.createdAt), {
                                                addSuffix: true,
                                                locale: zhCN,
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
                </motion.div>
            </div>
        </div>
    );
}
