'use client';

import { getRequestById, retryRequest } from '@/app/actions/requests';
import { translate } from '@/lib/i18n';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useMemo, useEffect, useState, useCallback } from 'react';
import * as Diff from 'diff';
import { html } from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, ArrowLeft, AlertCircle, RefreshCw, Loader2, X, User, Code2, FileDiff, Lightbulb } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import ShikiCodeRenderer from './ShikiCodeRenderer';
import StatusBadge from './StatusBadge';
import { EmptyState } from '@/components/ui/empty-state';
import AnalysisSection from './AnalysisSection';
import ProblemDisplay, { ProblemData } from './ProblemDisplay';
import ImageGallery from './ImageGallery';
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
        modification_analysis?: unknown[];
    } | null;
}

export default function RequestDetail({ requestId }: RequestDetailProps) {
    const router = useRouter();
    const [request, setRequest] = useState<Request | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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
    const isCompleted = request?.status === 'COMPLETED';

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
                <div className="p-6 border-b flex flex-col gap-4 bg-surface">
                    <div className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" onClick={handleBack} className="mr-1 md:hidden">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <StatusBadge status="PROCESSING" />
                        </div>
                        <Skeleton className="h-9 w-9 rounded-md" />
                    </div>
                    <Skeleton className="h-8 w-48" />
                </div>
                <ScrollArea className="flex-1 h-0 px-6 py-6">
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-5 rounded-md" />
                                <Skeleton className="h-5 w-32" />
                            </div>
                            <Skeleton className="h-32 w-full rounded-lg" />
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <Skeleton className="h-10 w-32 rounded-lg" />
                                <Skeleton className="h-10 w-32 rounded-lg" />
                                <Skeleton className="h-10 w-32 rounded-lg" />
                            </div>
                            <Skeleton className="h-64 w-full rounded-lg" />
                        </div>
                    </div>
                </ScrollArea>
            </div>
        );
    }

    // Error State
    if (!request || error) {
        return (
            <div className="h-full flex flex-col bg-surface border rounded-lg overflow-hidden" data-testid="request-detail-error">
                <div className="flex flex-col items-center justify-center h-full">
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
        <Tabs defaultValue="input" className="h-full flex flex-col bg-surface border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex-none bg-surface z-10 border-b">
                <div className="p-6 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Button variant="ghost" size="icon" onClick={handleBack} className="mr-0 md:hidden shrink-0">
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
                                onClick={handleRetry}
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
                        <Button variant="ghost" size="icon" onClick={handleBack} title={translate('requestDetails.closeDetails')}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="px-4 py-3 bg-surface/50 backdrop-blur-sm border-b overflow-x-auto no-scrollbar">
                <TabsList className="flex md:grid md:grid-cols-5 h-auto md:h-10 p-1 bg-surface2 rounded-lg border border-border min-w-max md:min-w-full">
                    <TabsTrigger value="input" className="whitespace-nowrap rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:text-primary py-2 md:py-1.5 flex-1 md:flex-none">
                        <User className="w-3.5 h-3.5 mr-1.5" />
                        {translate('requestDetails.userPrompt')}
                    </TabsTrigger>

                    {hasProblemData ? (
                        <TabsTrigger value="problem" className="whitespace-nowrap rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:text-primary py-2 md:py-1.5 flex-1 md:flex-none">
                            <Info className="w-3.5 h-3.5 mr-1.5" />
                            {translate('requestDetails.problemDetails')}
                        </TabsTrigger>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="opacity-50 flex items-center justify-center text-xs font-bold text-muted-foreground cursor-not-allowed">
                                    <Info className="w-3.5 h-3.5 mr-1.5" />
                                    {translate('requestDetails.problemDetails')}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{translate('requestDetails.stage1UnlockHint')}</p>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {hasCode ? (
                        <TabsTrigger value="code" className="whitespace-nowrap rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:text-primary py-2 md:py-1.5 flex-1 md:flex-none">
                            <Code2 className="w-3.5 h-3.5 mr-1.5" />
                            {translate('requestDetails.sourceCode')}
                        </TabsTrigger>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="opacity-50 flex items-center justify-center text-xs font-bold text-muted-foreground cursor-not-allowed">
                                    <Code2 className="w-3.5 h-3.5 mr-1.5" />
                                    {translate('requestDetails.sourceCode')}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{translate('requestDetails.stage2UnlockHint')}</p>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {isCompleted ? (
                        <>
                            <TabsTrigger value="diff" className="whitespace-nowrap rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:text-primary py-2 md:py-1.5 flex-1 md:flex-none">
                                <FileDiff className="w-3.5 h-3.5 mr-1.5" />
                                {translate('requestDetails.codeDiff')}
                            </TabsTrigger>
                            <TabsTrigger value="analysis" className="whitespace-nowrap rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:text-primary py-2 md:py-1.5 flex-1 md:flex-none">
                                <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                                {translate('requestDetails.analysisDetails')}
                            </TabsTrigger>
                        </>
                    ) : (
                        <>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="opacity-50 flex items-center justify-center text-xs font-bold text-muted-foreground cursor-not-allowed">
                                        <FileDiff className="w-3.5 h-3.5 mr-1.5" />
                                        {translate('requestDetails.codeDiff')}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{translate('requestDetails.analysisUnlockHint')}</p>
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="opacity-50 flex items-center justify-center text-xs font-bold text-muted-foreground cursor-not-allowed">
                                        <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                                        {translate('requestDetails.analysisDetails')}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{translate('requestDetails.analysisUnlockHint')}</p>
                                </TooltipContent>
                            </Tooltip>
                        </>
                    )}
                </TabsList>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 h-0">
                <div className="p-6 space-y-8 pb-12">
                    <TabsContent value="input" className="animate-in fade-in duration-300 space-y-6 mt-0">
                        {request.imageReferences && request.imageReferences.length > 0 && (
                            <ImageGallery
                                images={request.imageReferences}
                                layout="grid"
                                readonly={true}
                            />
                        )}
                        <div className="bg-primary-a10 rounded-lg p-6 border border-primary-a20 overflow-x-auto">
                            <MarkdownRenderer className="text-foreground leading-relaxed whitespace-pre-wrap text-sm">
                                {request.userPrompt || translate('requestDetails.noUserPrompt')}
                            </MarkdownRenderer>
                        </div>
                    </TabsContent>

                    <TabsContent value="problem" className="animate-in fade-in duration-300 mt-0">
                        {analysisData?.problem ? (
                            <ProblemDisplay data={analysisData.problem} />
                        ) : (
                            <Alert className="rounded-lg border-border bg-surface2">
                                <Info className="h-4 w-4" />
                                <AlertDescription>{translate('requestDetails.noProblemDetails')}</AlertDescription>
                            </Alert>
                        )}
                    </TabsContent>

                    <TabsContent value="code" className="animate-in fade-in duration-300 mt-0">
                        <div className="relative rounded-lg overflow-x-auto border border-border bg-surface2">
                            {analysisData?.code?.original_code ? (
                                <ShikiCodeRenderer
                                    code={analysisData.code.original_code}
                                    language={analysisData.code.language || 'python'}
                                />
                            ) : (
                                <Alert className="rounded-lg border-border bg-surface2 m-4">
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>{translate('requestDetails.noOriginalCode')}</AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="diff" className="animate-in fade-in duration-300 mt-0">
                        {diffHtml ? (
                            <div className="rounded-lg border border-border overflow-x-auto bg-white dark:bg-zinc-950">
                                <div
                                    className="p-1 scale-[0.9] origin-top-left"
                                    dangerouslySetInnerHTML={{ __html: diffHtml }}
                                />
                            </div>
                        ) : (
                            <Alert className="rounded-lg border-border bg-surface2">
                                <Info className="h-4 w-4" />
                                <AlertDescription>{translate('requestDetails.diffMissingBoth')}</AlertDescription>
                            </Alert>
                        )}
                    </TabsContent>

                    <TabsContent value="analysis" className="animate-in fade-in duration-300 mt-0">
                        <AnalysisSection request={request} mounted={mounted} />
                    </TabsContent>
                </div>
            </ScrollArea>
        </Tabs>
    );
}
