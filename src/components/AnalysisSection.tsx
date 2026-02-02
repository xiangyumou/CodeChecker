'use client';

import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import ShikiCodeRenderer from "./ShikiCodeRenderer";
import MarkdownRenderer from '@/components/MarkdownRenderer';
import type { RequestData } from '@/types/request';

interface AnalysisSectionProps {
    request: RequestData;
    mounted: boolean;
}

export default function AnalysisSection({ request, mounted }: AnalysisSectionProps) {
    const t = useTranslations('requestDetails');
    const analysis = request.gptRawResponse?.modification_analysis;

    if (!analysis || analysis.length === 0) {
        return (
            <Alert className="rounded-lg border-border bg-surface2">
                <Info className="h-4 w-4" />
                <AlertDescription>{t('noAnalysisDetails')}</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {analysis.map((mod: { original_snippet: string; modified_snippet: string; explanation: string }, idx: number) => (
                <div key={idx} className="relative pl-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-primary-a20">
                    <div className="absolute left-1 top-1.5 w-5 h-5 rounded-full bg-primary text-[10px] flex items-center justify-center font-bold text-white shadow-none">
                        {idx + 1}
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('originalSnippet')}</span>
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
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('modifiedSnippet')}</span>
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
                        <div className="bg-primary-a10 rounded-lg p-6 border border-primary-a20 overflow-x-auto">
                            <MarkdownRenderer className="text-foreground leading-relaxed whitespace-pre-wrap text-sm">
                                {mod.explanation}
                            </MarkdownRenderer>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
