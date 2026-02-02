'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check, Loader2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StageStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface PipelineStage {
    id: string;
    status: StageStatus;
    completedAt?: Date | null;
}

interface PipelineStatusProps {
    stages: PipelineStage[];
    className?: string;
}

export default function PipelineStatus({ stages, className }: PipelineStatusProps) {
    const t = useTranslations('requestDetails.pipeline');

    const getStageIcon = (status: StageStatus) => {
        switch (status) {
            case 'completed':
                return <Check className="w-4 h-4" />;
            case 'processing':
                return <Loader2 className="w-4 h-4 animate-spin" />;
            case 'failed':
                return <AlertCircle className="w-4 h-4" />;
            default:
                return <Clock className="w-4 h-4" />;
        }
    };

    const getStageColor = (status: StageStatus) => {
        switch (status) {
            case 'completed':
                return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'processing':
                return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'failed':
                return 'bg-destructive/10 text-destructive border-destructive/20';
            default:
                return 'bg-muted text-muted-foreground border-border';
        }
    };

    const getConnectionColor = (prevStatus: StageStatus, currentStatus: StageStatus) => {
        if (prevStatus === 'completed') {
            if (currentStatus === 'completed' || currentStatus === 'processing') {
                return 'bg-green-500/30';
            }
        }
        return 'bg-border';
    };

    return (
        <div className={cn('w-full', className)}>
            <div className="flex flex-col gap-4">
                {/* Desktop: Horizontal layout */}
                <div className="hidden md:flex items-center justify-between gap-2">
                    {stages.map((stage, index) => (
                        <div key={stage.id} className="flex items-center flex-1">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-center gap-3 flex-1"
                            >
                                {/* Stage indicator */}
                                <div className={cn(
                                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300',
                                    getStageColor(stage.status)
                                )}>
                                    {getStageIcon(stage.status)}
                                </div>

                                {/* Stage label */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-text truncate">
                                        {t(`stage${index + 1}` as 'stage1' | 'stage2' | 'stage3')}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Connection line */}
                            {index < stages.length - 1 && (
                                <div className="flex-shrink-0 px-2">
                                    <div className={cn(
                                        'h-0.5 w-12 rounded-full transition-all duration-500',
                                        getConnectionColor(stage.status, stages[index + 1].status)
                                    )} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Mobile: Horizontal layout with scrolling */}
                <div className="flex md:hidden items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {stages.map((stage, index) => (
                        <div key={stage.id} className="flex items-center">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-center gap-2"
                            >
                                {/* Stage indicator */}
                                <div className={cn(
                                    'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 flex-shrink-0',
                                    getStageColor(stage.status)
                                )}>
                                    {getStageIcon(stage.status)}
                                </div>

                                {/* Stage label (abbreviated or smaller on mobile) */}
                                <div className="whitespace-nowrap">
                                    <div className="text-[11px] font-bold text-text">
                                        {t(`stage${index + 1}` as 'stage1' | 'stage2' | 'stage3')}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Connection line */}
                            {index < stages.length - 1 && (
                                <div className="flex-shrink-0 px-2">
                                    <div className={cn(
                                        'h-0.5 w-6 rounded-full transition-all duration-500',
                                        getConnectionColor(stage.status, stages[index + 1].status)
                                    )} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
