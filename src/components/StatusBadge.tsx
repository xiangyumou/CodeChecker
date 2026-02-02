'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type RequestStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface StatusBadgeProps {
    status: RequestStatus | string;
    stage1Status?: string | null;
    stage2Status?: string | null;
    stage3Status?: string | null;
    className?: string;
}

const statusConfig = {
    QUEUED: { variant: 'secondary', icon: Clock, iconClass: '' },
    PROCESSING: { variant: 'info', icon: Loader2, iconClass: 'animate-spin' },
    COMPLETED: { variant: 'success', icon: CheckCircle2, iconClass: '' },
    FAILED: { variant: 'error', icon: AlertCircle, iconClass: '' },
} as const;

export default function StatusBadge({
    status,
    stage1Status,
    stage2Status,
    stage3Status,
    className
}: StatusBadgeProps) {
    const t = useTranslations('requestList');

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.QUEUED;
    const StatusIcon = config.icon;

    const getLabel = () => {
        if (status !== 'PROCESSING') {
            const key = status.toLowerCase();
            // Fallback for unknown status
            try {
                return t(key);
            } catch {
                return status;
            }
        }

        // For PROCESSING, try to show stage progress
        let completedStages = 0;
        if (stage1Status === 'completed') completedStages++;
        if (stage2Status === 'completed') completedStages++;
        if (stage3Status === 'completed') completedStages++;

        const currentStage = Math.min(completedStages + 1, 3);
        return t('stage', { stage: currentStage });
    };

    return (
        <Badge
            variant={config.variant as any}
            className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] font-medium border-0 shadow-none",
                className
            )}
            data-testid="request-status-badge"
        >
            <StatusIcon className={cn("w-3 h-3 mr-1", config.iconClass)} />
            {getLabel()}
        </Badge>
    );
}
