'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export type RequestStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface StatusBadgeProps {
    status: RequestStatus | string;
    className?: string;
}

const statusConfig = {
    QUEUED: { variant: 'secondary', icon: Clock, iconClass: '', label: '等待中' },
    PROCESSING: { variant: 'info', icon: Loader2, iconClass: 'animate-spin', label: '处理中' },
    COMPLETED: { variant: 'success', icon: CheckCircle2, iconClass: '', label: '已完成' },
    FAILED: { variant: 'error', icon: AlertCircle, iconClass: '', label: '失败' },
} as const;

export default function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.QUEUED;
    const StatusIcon = config.icon;

    return (
        <Badge
            variant={config.variant as 'secondary' | 'default'}
            className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] font-medium border-0 shadow-none",
                className
            )}
            data-testid="request-status-badge"
        >
            <StatusIcon className={cn("w-3 h-3 mr-1", config.iconClass)} />
            {config.label}
        </Badge>
    );
}
