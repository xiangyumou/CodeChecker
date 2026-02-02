'use client';

import { trpc } from '@/utils/trpc';
import { useTranslations } from 'next-intl';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useMemo, useEffect, useState, useRef } from 'react';
import * as Diff from 'diff';
import { html } from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useUIStore } from '@/store/useUIStore';
import ShikiCodeRenderer from './ShikiCodeRenderer';
import StatusBadge from './StatusBadge';
import RequestDetailHeader from './RequestDetailHeader';
import RequestDetailTabs from './RequestDetailTabs';
import { EmptyState } from '@/components/ui/empty-state';
import AnalysisSection from './AnalysisSection';
import ProblemDisplay, { ProblemData } from './ProblemDisplay';
import { useRequestPolling } from '@/hooks/useSmartPolling';
import ImageGallery from './ImageGallery';

// Props interface
export interface RequestDetailPanelProps {
    // Directly pass request data (optional)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request?: any;
    isLoading?: boolean;
}

export default function RequestDetailPanel({
    request: propRequest,
    isLoading: propIsLoading = false,
}: RequestDetailPanelProps = {}) {
    const t = useTranslations('requestDetails');
    const { selectedRequestId, createNewRequest } = useUIStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
    }, []);

    const utils = trpc.useUtils();
    const requestPolling = useRequestPolling();

    // Dashboard mode: query from tRPC using UIStore
    // Share mode: skip query, use propRequest
    const { data: queryRequest, isLoading: queryIsLoading, error: queryError } = trpc.requests.getById.useQuery(
        selectedRequestId!,
        {
            enabled: !!selectedRequestId && !propRequest,
            retry: false, // Don't retry on failure (prevents infinite loop on 404)
            // Smart polling: only poll for active requests
            refetchInterval: requestPolling,
            refetchIntervalInBackground: false,
        }
    );

    // Track previous status to detect changes and sync sidebar
    const prevStatusRef = useRef<string | undefined>(undefined);

    // Unify data source and loading state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const request = (propRequest || queryRequest) as any;
    const isLoading = propRequest ? propIsLoading : queryIsLoading;
    const requestId = propRequest ? propRequest.id : selectedRequestId;

    // Sync sidebar when status changes (must be after request is defined)
    useEffect(() => {
        if (!propRequest && request?.status && prevStatusRef.current !== undefined && prevStatusRef.current !== request.status) {
            // Status changed - invalidate sidebar list to refresh
            utils.requests.list.invalidate();
        }
        prevStatusRef.current = request?.status;
    }, [request?.status, utils, propRequest]);

    // Generate diff HTML
    const diffHtml = useMemo(() => {
        if (!request?.gptRawResponse?.original_code || !request?.gptRawResponse?.modified_code) {
            return null;
        }

        const originalCode = request.gptRawResponse.original_code;
        const modifiedCode = request.gptRawResponse.modified_code;

        const diffText = Diff.createPatch(
            'code',
            originalCode,
            modifiedCode,
            'Original',
            'Modified'
        );

        const diffHtmlOutput = html(diffText, {
            drawFileList: false,
            matching: 'lines',
            outputFormat: 'side-by-side',
        });

        return diffHtmlOutput;
    }, [request]);

    const retryMutation = trpc.requests.retry.useMutation({
        onSuccess: async () => {
            // Show user feedback immediately
            toast.success(t('retryStarted'), {
                description: t('retryStartedDescription'),
            });
            // Use refetch() instead of invalidate() for immediate UI update
            // invalidate() only marks cache as stale; refetch() forces immediate data fetch
            await Promise.all([
                utils.requests.getById.refetch(requestId!),
                utils.requests.list.refetch(),
            ]);
        },
        onError: (error) => {
            toast.error(t('retryFailed'), {
                description: error.message,
            });
        },
    });

    const handleRetry = () => {
        if (requestId) {
            retryMutation.mutate(requestId);
        }
    };



    if (!requestId) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <EmptyState
                    icon={Info}
                    title={t('selectRequestToView')}
                />
            </div>
        );
    }

    // Loading State
    if (isLoading) {
        return (
            <div className="h-full flex flex-col bg-surface border rounded-lg overflow-hidden" data-testid="request-detail-loading">
                <div className="p-6 border-b flex flex-col gap-4 bg-surface">
                    <div className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" onClick={createNewRequest} className="mr-1 md:hidden">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            {/* Show actual loading status */}
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

    // Empty/Error State - static page, no polling (prevents infinite loop on deleted requests)
    if (!request || queryError) {
        return (
            <div className="h-full flex flex-col bg-surface border rounded-lg overflow-hidden" data-testid="request-detail-error">
                <div className="flex flex-col items-center justify-center h-full">
                    <EmptyState
                        icon={AlertCircle}
                        title={t('requestNotFound')}
                        description={`ID: ${requestId || 'unknown'}`}
                        action={
                            <Button variant="outline" onClick={createNewRequest}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                {t('backToCreate') || 'Back'}
                            </Button>
                        }
                    />
                </div>
            </div>
        );
    }

    return (
        <Tabs defaultValue="input" className="h-full flex flex-col bg-surface border rounded-lg overflow-hidden">
            <RequestDetailHeader
                requestId={requestId}
                request={request}
                onRetry={handleRetry}
                onClose={createNewRequest}
                isRetrying={retryMutation.status === 'pending'}
            />

            <RequestDetailTabs request={request} />

            {/* Scrollable Content */}
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
                                {request.userPrompt || t('noUserPrompt')}
                            </MarkdownRenderer>
                        </div>
                    </TabsContent>

                    <TabsContent value="problem" className="animate-in fade-in duration-300 mt-0">
                        {(() => {
                            const problemData = (request.problemDetails || request.gptRawResponse?.organized_problem) as ProblemData | null;

                            if (problemData) {
                                return <ProblemDisplay data={problemData} />;
                            }

                            return (
                                <Alert className="rounded-lg border-border bg-surface2">
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>{t('noProblemDetails')}</AlertDescription>
                                </Alert>
                            );
                        })()}
                    </TabsContent>

                    <TabsContent value="code" className="animate-in fade-in duration-300 mt-0">
                        <div className="relative rounded-lg overflow-x-auto border border-border bg-surface2">
                            {request.formattedCode ? (
                                <ShikiCodeRenderer
                                    code={request.formattedCode}
                                    language="python"
                                />
                            ) : request.gptRawResponse?.original_code ? (
                                <ShikiCodeRenderer
                                    code={request.gptRawResponse.original_code}
                                    language="python"
                                />
                            ) : (
                                <Alert className="rounded-lg border-border bg-surface2 m-4">
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>{t('noOriginalCode')}</AlertDescription>
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
                                <AlertDescription>{t('diffMissingBoth')}</AlertDescription>
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
