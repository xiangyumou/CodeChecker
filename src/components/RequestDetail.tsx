'use client';

import { getRequestById, retryRequest } from '@/app/actions/requests';
import { translate } from '@/lib/i18n';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useMemo, useEffect, useState, useCallback } from 'react';
import * as Diff from 'diff';
import { html } from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Info,
    ArrowLeft,
    AlertCircle,
    RefreshCw,
    Loader2,
    X,
    User,
    FileText,
    FileDiff,
    Lightbulb,
    ChevronRight,
    Code2
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import StatusBadge from './StatusBadge';
import { EmptyState } from '@/components/ui/empty-state';
import ProblemDisplay, { ProblemData } from './ProblemDisplay';
import ImageGallery from './ImageGallery';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import type { Request } from '@/lib/db/schema';

interface RequestDetailProps {
    requestId: number | null;
}

// Helper to safely access nested data from analysis result
function getAnalysisData(request: Request | null) {
    if (!request?.analysisResult) return null;
    return request.analysisResult as {
        problem?: ProblemData;
        code?: { language?: string; original_code?: string };
        modified_code?: string;
        modification_analysis?: Array<{
            section?: string;
            location?: string;
            original?: string;
            modified?: string;
            reason?: string;
        }>;
    } | null;
}

export default function RequestDetail({ requestId }: RequestDetailProps) {
    const router = useRouter();
    const [request, setRequest] = useState<Request | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);

    // Load request data
    const loadRequest = useCallback(async () => {
        if (!requestId) return;

        try {
            setIsLoading(true);
            setError(null);
            const data = await getRequestById(requestId);
            if (data) {
                setRequest(data);
            } else {
                setError(new Error('Request not found'));
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setIsLoading(false);
        }
    }, [requestId]);

    useEffect(() => {
        loadRequest();
    }, [loadRequest]);

    // Polling for active requests
    useEffect(() => {
        if (!requestId) return;
        if (!request || (request.status !== 'QUEUED' && request.status !== 'PROCESSING')) {
            return;
        }

        const interval = setInterval(loadRequest, 5000);
        return () => clearInterval(interval);
    }, [requestId, request, loadRequest]);

    // Generate diff HTML
    const diffHtml = useMemo(() => {
        const analysisData = getAnalysisData(request);
        const originalCode = analysisData?.code?.original_code;
        const modifiedCode = analysisData?.modified_code;

        if (!originalCode || !modifiedCode) {
            return null;
        }

        const diffText = Diff.createPatch(
            'code',
            originalCode,
            modifiedCode,
            'Original',
            'Modified'
        );

        return html(diffText, {
            drawFileList: false,
            matching: 'lines',
            outputFormat: 'side-by-side',
        });
    }, [request]);

    const handleRetry = async () => {
        if (!requestId) return;

        try {
            setIsRetrying(true);
            await retryRequest(requestId);
            toast.success(translate('requestDetails.retryStarted'), {
                description: translate('requestDetails.retryStartedDescription'),
            });
            await loadRequest();
        } catch (err) {
            toast.error(translate('requestDetails.retryFailed'), {
                description: err instanceof Error ? err.message : 'Unknown error',
            });
        } finally {
            setIsRetrying(false);
        }
    };

    const handleBack = () => {
        router.push('/');
    };

    const analysisData = getAnalysisData(request);
    const hasProblemData = !!analysisData?.problem;
    const hasCode = !!(analysisData?.code?.original_code ?? request?.gptRawResponse);
    const hasDiff = !!diffHtml;
    const isCompleted = request?.status === 'COMPLETED';
    const modificationAnalysis = analysisData?.modification_analysis || [];

    if (!requestId) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <EmptyState
                    icon={Info}
                    title={translate('requestDetails.selectRequestToView')}
                />
            </div>
        );
    }

    // Loading State
    if (isLoading && !request) {
        return (
            <div className="h-full flex flex-col bg-surface border rounded-lg overflow-hidden" data-testid="request-detail-loading">
                <div className="p-4 border-b flex items-center justify-between bg-surface">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={handleBack} className="md:hidden">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <Skeleton className="h-6 w-32" />
                    </div>
                    <Skeleton className="h-9 w-9 rounded-md" />
                </div>
                <div className="flex-1 p-6 space-y-6">
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <div className="space-y-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    // Error State
    if (!request || error) {
        return (
            <div className="h-full flex flex-col bg-surface border rounded-lg overflow-hidden" data-testid="request-detail-error">
                <div className="flex flex-col items-center justify-center h-full p-6">
                    <EmptyState
                        icon={AlertCircle}
                        title={translate('requestDetails.requestNotFound')}
                        description={`ID: ${requestId || 'unknown'}`}
                        action={
                            <Button variant="outline" onClick={handleBack}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                {translate('requestDetails.backToCreate')}
                            </Button>
                        }
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-surface border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex-none bg-surface z-10 border-b">
                <div className="px-4 py-3 flex flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0 md:hidden h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-2 min-w-0">
                            <h2 className="text-base font-bold tracking-tight text-text truncate">
                                {translate('requestDetails.drawerTitleWithId', { id: String(requestId) })}
                            </h2>
                            <StatusBadge status={request.status} />
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {(request.status === 'FAILED' || request.status === 'COMPLETED') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleRetry}
                                disabled={isRetrying}
                                className="gap-1.5 h-8 px-2.5"
                            >
                                {isRetrying ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-3.5 w-3.5" />
                                )}
                                <span className="hidden sm:inline text-xs">{translate('requestDetails.retry')}</span>
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8" title={translate('requestDetails.closeDetails')}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {/* Code Diff - Core Content */}
                    {hasDiff ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                                <FileDiff className="h-3.5 w-3.5" />
                                <span>{translate('requestDetails.codeDiff')}</span>
                            </div>
                            <div className="rounded-lg border border-border overflow-hidden bg-white dark:bg-zinc-950">
                                <div
                                    className="diff-container"
                                    dangerouslySetInnerHTML={{ __html: diffHtml }}
                                />
                            </div>
                        </div>
                    ) : hasCode ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                                <Code2 className="h-3.5 w-3.5" />
                                <span>{translate('requestDetails.sourceCode')}</span>
                            </div>
                            <div className="relative rounded-lg overflow-x-auto border border-border bg-surface2 p-4">
                                {analysisData?.code?.original_code ? (
                                    <pre className="text-sm font-mono whitespace-pre-wrap">
                                        {analysisData.code.original_code}
                                    </pre>
                                ) : (
                                    <Alert className="rounded-lg border-border bg-surface2">
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>{translate('requestDetails.noOriginalCode')}</AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        </div>
                    ) : null}

                    {/* Collapsible Sections */}
                    <div className="space-y-0 pt-2">
                        {/* Original Submission */}
                        <CollapsibleSection
                            title={translate('requestDetails.userPrompt')}
                            icon={<User className="h-4 w-4" />}
                            defaultOpen={!hasDiff}
                        >
                            <div className="space-y-4">
                                {(() => {
                                    const images = request.imageReferences as string[] | null;
                                    return images && images.length > 0 ? (
                                        <ImageGallery
                                            images={images}
                                            layout="grid"
                                            readonly={true}
                                        />
                                    ) : null;
                                })()}
                                <div className="bg-surface2 rounded-lg p-4 border border-border">
                                    <MarkdownRenderer className="text-sm leading-relaxed whitespace-pre-wrap">
                                        {request.userPrompt || translate('requestDetails.noUserPrompt')}
                                    </MarkdownRenderer>
                                </div>
                            </div>
                        </CollapsibleSection>

                        {/* Problem Details */}
                        {hasProblemData && (
                            <CollapsibleSection
                                title={translate('requestDetails.problemDetails')}
                                icon={<FileText className="h-4 w-4" />}
                                defaultOpen={false}
                            >
                                {analysisData?.problem ? (
                                    <ProblemDisplay data={analysisData.problem} />
                                ) : (
                                    <Alert className="rounded-lg border-border bg-surface2">
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>{translate('requestDetails.noProblemDetails')}</AlertDescription>
                                    </Alert>
                                )}
                            </CollapsibleSection>
                        )}

                        {/* Block Analysis */}
                        {isCompleted && modificationAnalysis.length > 0 && (
                            <CollapsibleSection
                                title={`${translate('requestDetails.analysisDetails')} (${modificationAnalysis.length})`}
                                icon={<Lightbulb className="h-4 w-4" />}
                                defaultOpen={false}
                            >
                                <div className="space-y-3">
                                    {modificationAnalysis.map((block, index) => (
                                        <div
                                            key={index}
                                            className="bg-surface2 rounded-lg p-4 border border-border space-y-3"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                                    {index + 1}
                                                </span>
                                                {block.section && (
                                                    <span className="text-sm font-medium">{block.section}</span>
                                                )}
                                                {block.location && (
                                                    <span className="text-xs text-muted-foreground ml-auto">
                                                        {block.location}
                                                    </span>
                                                )}
                                            </div>

                                            {(block.original || block.modified) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                                    {block.original && (
                                                        <div className="space-y-1">
                                                            <span className="text-muted-foreground text-[10px] uppercase tracking-wide">Original</span>
                                                            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded p-2 font-mono">
                                                                <code className="text-red-700 dark:text-red-400">{block.original}</code>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {block.modified && (
                                                        <div className="space-y-1">
                                                            <span className="text-muted-foreground text-[10px] uppercase tracking-wide">Modified</span>
                                                            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded p-2 font-mono">
                                                                <code className="text-green-700 dark:text-green-400">{block.modified}</code>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {block.reason && (
                                                <div className="text-sm text-muted-foreground leading-relaxed">
                                                    {block.reason}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CollapsibleSection>
                        )}
                    </div>

                    {/* Processing State */}
                    {request.status === 'PROCESSING' && (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            <span className="text-sm">{translate('requestDetails.processing')}</span>
                        </div>
                    )}

                    {/* Failed State */}
                    {request.status === 'FAILED' && (
                        <Alert className="rounded-lg border-border bg-surface2 border-l-4 border-l-danger">
                            <AlertCircle className="h-4 w-4 text-danger" />
                            <AlertDescription className="text-danger">
                                {request.errorMessage || translate('requestDetails.failed')}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
