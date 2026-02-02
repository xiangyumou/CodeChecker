'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, RefreshCw, X } from "lucide-react";
import StatusBadge from "./StatusBadge";
import PipelineStatus, { type StageStatus } from "./PipelineStatus";
import { useTranslations } from "next-intl";
import type { RequestData } from '@/types/request';

interface RequestDetailHeaderProps {
    requestId: number | null;
    request: RequestData;
    onRetry: () => void;
    onClose: () => void;
    isRetrying?: boolean;
}

export default function RequestDetailHeader({
    requestId,
    request,
    onRetry,
    onClose,
    isRetrying = false
}: RequestDetailHeaderProps) {
    const t = useTranslations('requestDetails');

    return (
        <div className="flex-none bg-surface z-10 shadow-sm border-b">
            <div className="p-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Button variant="ghost" size="icon" onClick={onClose} className="mr-0 md:hidden shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 min-w-0 flex-1">
                        <h2 className="text-[18px] md:text-[20px] font-bold tracking-tight text-text truncate">
                            {requestId ? t('drawerTitleWithId', { id: requestId }) : t('drawerTitle')}
                        </h2>
                        <StatusBadge
                            status={request.status}
                            stage1Status={request.stage1Status}
                            stage2Status={request.stage2Status}
                            stage3Status={request.stage3Status}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {(request.status === 'FAILED' || request.status === 'COMPLETED') && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRetry}
                            disabled={isRetrying}
                            className="gap-2"
                        >
                            {isRetrying ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            {t('retry')}
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={onClose} title={t('closeDetails')}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div className="px-6 pb-6">
                <PipelineStatus
                    stages={[
                        {
                            id: 'stage1',
                            status: (request.stage1Status || 'pending') as StageStatus,
                            completedAt: request.stage1CompletedAt,
                        },
                        {
                            id: 'stage2',
                            status: (request.stage2Status || 'pending') as StageStatus,
                            completedAt: request.stage2CompletedAt,
                        },
                        {
                            id: 'stage3',
                            status: (request.stage3Status || 'pending') as StageStatus,
                            completedAt: request.stage3CompletedAt,
                        },
                    ]}
                />
            </div>
        </div>
    );
}
