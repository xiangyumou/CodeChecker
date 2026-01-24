'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, RefreshCw, X } from "lucide-react";
import StatusBadge from "./StatusBadge";
import PipelineStatus, { type StageStatus } from "./PipelineStatus";
import { useTranslations } from "next-intl";

interface RequestDetailHeaderProps {
    requestId: number | null;
    request: any;
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
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onClose} className="mr-1 md:hidden">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="text-2xl font-extrabold tracking-tight text-text">
                        {requestId ? t('drawerTitleWithId', { id: requestId }) : t('drawerTitle')}
                    </h2>
                    <StatusBadge 
                        status={request.status} 
                        stage1Status={request.stage1Status}
                        stage2Status={request.stage2Status}
                        stage3Status={request.stage3Status}
                    />
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
