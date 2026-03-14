'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, RefreshCw, X } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { translate } from "@/lib/i18n";

interface RequestDetailHeaderProps {
    requestId: number | null;
    request: {
        status: string;
    };
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
    return (
        <div className="flex-none bg-surface z-10 border-b">
            <div className="p-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Button variant="ghost" size="icon" onClick={onClose} className="mr-0 md:hidden shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 min-w-0 flex-1">
                        <h2 className="text-[18px] md:text-[20px] font-bold tracking-tight text-text truncate">
                            {requestId
                                ? translate('requestDetails.drawerTitleWithId', { id: String(requestId) })
                                : translate('requestDetails.drawerTitle')}
                        </h2>
                        <StatusBadge status={request.status} />
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
                            {translate('requestDetails.retry')}
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={onClose} title={translate('requestDetails.closeDetails')}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
