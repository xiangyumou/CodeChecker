'use client';

import { trpc } from '@/utils/trpc';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useMemo, useEffect, useState } from 'react';
import * as Diff from 'diff';
import { html } from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Loader2,
    Info,
    CheckCircle2,
    AlertCircle,
    Clock,
    Code2,
    FileDiff,
    Lightbulb,
    FileText,
    ArrowLeft,
    X,
    User,
    Image as ImageIcon,
    RefreshCw,
    Share2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useUIStore } from '@/store/useUIStore';
import { useTheme } from 'next-themes';
import ShikiCodeRenderer from './ShikiCodeRenderer';
import PipelineStatus, { type StageStatus } from './PipelineStatus';
import ProblemDisplay, { ProblemData } from './ProblemDisplay';
import { ZoomableImage } from './ui/ZoomableImage';

export default function RequestDetailPanel() {
    const t = useTranslations('requestDetails');
    const { selectedRequestId, createNewRequest } = useUIStore();
    const requestId = selectedRequestId;
    const { theme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const currentTheme = theme === 'system' ? systemTheme : theme;
    const isDark = currentTheme === 'dark';

    const { data: requestQuery, isLoading } = trpc.requests.getById.useQuery(
        requestId!,
        {
            enabled: !!requestId,
        }
    );

    // Cast request to any/extended type to avoid stale type errors
    // The fields EXIST in the DB (checked schema.prisma), but TRPC types seem stale in this environment.
    const request = requestQuery as any;

    const statusConfig = {
        QUEUED: { color: 'bg-muted text-muted-foreground', icon: Clock },
        PROCESSING: { color: 'bg-blue-500/10 text-blue-500 animate-pulse', icon: Loader2 },
        COMPLETED: { color: 'bg-green-500/10 text-green-500', icon: CheckCircle2 },
        FAILED: { color: 'bg-destructive/10 text-destructive', icon: AlertCircle },
    } as const;

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

    // Safety check for status config
    const config = (request?.status && statusConfig[request.status as keyof typeof statusConfig])
        ? statusConfig[request.status as keyof typeof statusConfig]
        : statusConfig.QUEUED;

    const StatusIcon = config.icon;

    const utils = trpc.useUtils();
    const retryMutation = trpc.requests.retry.useMutation({
        onSuccess: () => {
            utils.requests.getById.invalidate(requestId!);
            utils.requests.list.invalidate();
        },
    });

    const handleRetry = () => {
        if (requestId) {
            retryMutation.mutate(requestId);
        }
    };

    const handleShare = () => {
        if (!requestId) return;
        const url = `${window.location.origin}/share/${requestId}`;
        navigator.clipboard.writeText(url);
        toast.success(t('linkCopied'), {
            description: t('linkCopiedDescription'),
        });
    };

    if (!requestId) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-muted-foreground">
                <Info className="w-12 h-12" />
                <p className="text-lg font-medium">{t('selectRequestToView')}</p>
            </div>
        );
    }

    // Loading State
    if (isLoading) {
        return (
            <div className="h-full flex flex-col bg-surface border rounded-lg overflow-hidden">
                <div className="p-6 border-b flex flex-col gap-4 bg-surface">
                    <div className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" onClick={createNewRequest} className="mr-1 md:hidden">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <h2 className="text-2xl font-extrabold tracking-tight text-text">
                                {requestId ? t('drawerTitleWithId', { id: requestId }) : t('drawerTitle')}
                            </h2>
                        </div>
                        <Button variant="ghost" size="icon" onClick={createNewRequest} title={t('closeDetails')}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
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

    // Empty/Error State
    if (!request) {
        return (
            <div className="h-full flex flex-col bg-surface border rounded-lg overflow-hidden">
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <AlertCircle className="w-12 h-12 text-muted" />
                    <p className="text-lg font-medium text-text">{t('requestNotFound')}</p>
                </div>
            </div>
        );
    }

    return (
        <Tabs defaultValue="input" className="h-full flex flex-col bg-surface border rounded-lg overflow-hidden">
            {/* Sticky Header Section */}
            <div className="flex-none bg-surface z-10 shadow-sm border-b">
                {/* Top Title Bar */}
                <div className="p-6 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={createNewRequest} className="mr-1 md:hidden">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h2 className="text-2xl font-extrabold tracking-tight text-text">
                            {requestId ? t('drawerTitleWithId', { id: requestId }) : t('drawerTitle')}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleShare}
                            title={t('share')}
                        >
                            <Share2 className="h-5 w-5" />
                        </Button>
                        {(request.status === 'FAILED' || request.status === 'COMPLETED') && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRetry}
                                disabled={retryMutation.status === 'pending'}
                                className="gap-2"
                            >
                                {retryMutation.status === 'pending' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                {t('retry')}
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={createNewRequest} title={t('closeDetails')}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Persistent Pipeline Status */}
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

                {/* Divider Line 1 (Already implicit by previous sections, but adding explicit separator logic if needed) 
                    The user asked for "two horizontal lines to put these two together".
                    I will use a border-top on the tabs container to separate it from pipeline, and the main border-b of the header separates it from content.
                */}
                <div className="border-t border-border" />

                {/* Tabs List */}
                <div className="px-6 py-3 bg-surface/50 backdrop-blur-sm">
                    <TabsList className="w-full grid grid-cols-5 h-10 p-1 bg-surface2 rounded-lg border border-border">
                        <TabsTrigger value="input" className="rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:shadow-sm data-[state=active]:text-primary">
                            <User className="w-3.5 h-3.5 mr-1.5" />
                            {t('userPrompt')}
                        </TabsTrigger>
                        {/* Progressive tab unlocking based on stage completion */}
                        {(request.stage1Status === 'completed' || request.status === 'COMPLETED') ? (
                            <TabsTrigger value="problem" className="rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:shadow-sm data-[state=active]:text-primary">
                                <Info className="w-3.5 h-3.5 mr-1.5" />
                                {t('problemDetails')}
                            </TabsTrigger>
                        ) : (
                            <div className="opacity-50 flex items-center justify-center text-xs font-bold text-muted cursor-not-allowed">
                                <Info className="w-3.5 h-3.5 mr-1.5" />
                                {t('problemDetails')}
                            </div>
                        )}
                        {(request.stage2Status === 'completed' || request.status === 'COMPLETED') ? (
                            <TabsTrigger value="code" className="rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:shadow-sm data-[state=active]:text-primary">
                                <Code2 className="w-3.5 h-3.5 mr-1.5" />
                                {t('sourceCode')}
                            </TabsTrigger>
                        ) : (
                            <div className="opacity-50 flex items-center justify-center text-xs font-bold text-muted cursor-not-allowed">
                                <Code2 className="w-3.5 h-3.5 mr-1.5" />
                                {t('sourceCode')}
                            </div>
                        )}
                        {request.status === 'COMPLETED' ? (
                            <>
                                <TabsTrigger value="diff" className="rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:shadow-sm data-[state=active]:text-primary">
                                    <FileDiff className="w-3.5 h-3.5 mr-1.5" />
                                    {t('codeDiff')}
                                </TabsTrigger>
                                <TabsTrigger value="analysis" className="rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:shadow-sm data-[state=active]:text-primary">
                                    <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                                    {t('analysisDetails')}
                                </TabsTrigger>
                            </>
                        ) : (
                            <>
                                <div className="opacity-50 flex items-center justify-center text-xs font-bold text-muted cursor-not-allowed">
                                    <FileDiff className="w-3.5 h-3.5 mr-1.5" />
                                    {t('codeDiff')}
                                </div>
                                <div className="opacity-50 flex items-center justify-center text-xs font-bold text-muted cursor-not-allowed">
                                    <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                                    {t('analysisDetails')}
                                </div>
                            </>
                        )}
                    </TabsList>
                </div>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1 h-0">
                <div className="p-6 space-y-8 pb-12">
                    <TabsContent value="input" className="animate-in fade-in duration-300 space-y-6 mt-0">
                        {request.imageReferences && request.imageReferences.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-sm font-bold text-muted flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" />
                                    {t('submittedImages', { count: request.imageReferences.length })}
                                </span>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {request.imageReferences.map((ref: string, idx: number) => (
                                        <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted">
                                            <ZoomableImage
                                                src={ref}
                                                alt={t('submittedImageAlt', { index: idx + 1 })}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="bg-primary/5 rounded-lg p-6 border border-primary/10">
                            <div className="prose dark:prose-invert max-w-none text-foreground leading-relaxed whitespace-pre-wrap text-sm">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                >
                                    {request.userPrompt || t('noUserPrompt')}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Problem Details */}
                    {(request.stage1Status === 'completed' || request.status === 'COMPLETED') && (
                        <TabsContent value="problem" className="animate-in fade-in duration-300 mt-0">
                            {(() => {
                                let problemData: ProblemData | string | null = null;

                                if (request.problemDetails) {
                                    if (typeof request.problemDetails === 'string') {
                                        try {
                                            problemData = JSON.parse(request.problemDetails);
                                        } catch (e) {
                                            problemData = request.problemDetails;
                                        }
                                    } else {
                                        problemData = request.problemDetails as unknown as ProblemData;
                                    }
                                } else if (request.gptRawResponse?.organized_problem) {
                                    // Legacy/Fallback support
                                    problemData = request.gptRawResponse.organized_problem as unknown as ProblemData;
                                }

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
                    )}

                    {/* Source Code */}
                    {(request.stage2Status === 'completed' || request.status === 'COMPLETED') && (
                        <TabsContent value="code" className="animate-in fade-in duration-300 mt-0">
                            <div className="relative rounded-lg overflow-hidden border border-border bg-surface2">
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
                    )}

                    {/* Code Diff & Analysis */}
                    {request.status === 'COMPLETED' && (
                        <>
                            <TabsContent value="diff" className="animate-in fade-in duration-300 mt-0">
                                {diffHtml ? (
                                    <div className="rounded-lg border border-border overflow-hidden bg-white dark:bg-zinc-950">
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
                                <div className="space-y-6">
                                    {request.gptRawResponse?.modification_analysis?.length > 0 ? (
                                        request.gptRawResponse.modification_analysis.map((mod: { original_snippet: string; modified_snippet: string; explanation: string }, idx: number) => (
                                            <div key={idx} className="relative pl-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-primary/20">
                                                <div className="absolute left-1 top-1.5 w-5 h-5 rounded-full bg-primary text-[10px] flex items-center justify-center font-bold text-primary-foreground">
                                                    {idx + 1}
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 gap-4">
                                                        <div className="space-y-2">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{t('originalSnippet')}</span>
                                                            <div className="rounded-lg overflow-hidden border border-border">
                                                                {mounted ? (
                                                                    <ShikiCodeRenderer
                                                                        language="cpp"
                                                                        code={mod.original_snippet}
                                                                        showLineNumbers={false}
                                                                        className="shiki-container text-[0.8125rem]"
                                                                    />
                                                                ) : (
                                                                    <pre className="p-3">
                                                                        <code>{mod.original_snippet}</code>
                                                                    </pre>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{t('modifiedSnippet')}</span>
                                                            <div className="rounded-lg overflow-hidden border border-border">
                                                                {mounted ? (
                                                                    <ShikiCodeRenderer
                                                                        language="cpp"
                                                                        code={mod.modified_snippet}
                                                                        showLineNumbers={false}
                                                                        className="shiki-container text-[0.8125rem]"
                                                                    />
                                                                ) : (
                                                                    <pre className="p-3">
                                                                        <code>{mod.modified_snippet}</code>
                                                                    </pre>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-primary/5 rounded-lg p-6 border border-primary/10">
                                                        <div className="prose dark:prose-invert max-w-none text-foreground leading-relaxed whitespace-pre-wrap text-sm">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                                rehypePlugins={[rehypeKatex]}
                                                            >
                                                                {mod.explanation}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <Alert className="rounded-lg border-border bg-surface2">
                                            <Info className="h-4 w-4" />
                                            <AlertDescription>{t('noAnalysisDetails')}</AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            </TabsContent>
                        </>
                    )}

                </div>
            </ScrollArea>
        </Tabs>
    );
}
