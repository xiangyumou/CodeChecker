import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Database, FileText, Terminal } from "lucide-react";
import { useTranslations } from 'next-intl';

export interface ProblemData {
    title: string;
    time_limit: string;
    memory_limit: string;
    description: string;
    input_format: string;
    output_format: string;
    input_sample: string;
    output_sample: string;
    notes: string;
}

interface ProblemDisplayProps {
    data: ProblemData | string;
}

const MarkdownContent = ({ content }: { content: string }) => {
    const t = useTranslations('requestDetails');
    if (!content || content === 'N/A') return <span className="text-muted-foreground italic">{t('none')}</span>;
    return (
        <div className="prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed text-sm">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">{title}</h3>
    </div>
);

export default function ProblemDisplay({ data }: ProblemDisplayProps) {
    const t = useTranslations('requestDetails');
    // Handle case where data might be passed as string (e.g. from raw response before parsing)
    // or if parsing failed and we just have raw text. 
    // Ideally the parent component handles parsing, but safety check here is good.
    const problem = typeof data === 'string' ? null : data;

    if (!problem) {
        // Fallback or empty state handled by parent usually, but if string passed, display as raw markdown
        if (typeof data === 'string') {
            return (
                <Card className="border-none shadow-none bg-transparent">
                    <CardContent className="p-0">
                        <MarkdownContent content={data} />
                    </CardContent>
                </Card>
            );
        }
        return null;
    }

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-300 pb-10">
            {/* Header / Title Section */}
            <div className="space-y-4">
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                    {problem.title}
                </h1>

                <div className="flex flex-wrap gap-3">
                    <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold flex items-center gap-1.5 h-7">
                        <Clock className="w-3.5 h-3.5" />
                        {problem.time_limit}
                    </Badge>
                    <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold flex items-center gap-1.5 h-7">
                        <Database className="w-3.5 h-3.5" />
                        {problem.memory_limit}
                    </Badge>
                </div>
            </div>

            <Separator />

            {/* Description */}
            <section>
                <SectionHeader icon={FileText} title={t('problemDescription')} />
                <div className="bg-primary/5 rounded-lg p-6 border border-primary/10">
                    <MarkdownContent content={problem.description} />
                </div>
            </section>

            {/* Input & Output Format */}
            <div className="grid md:grid-cols-2 gap-8">
                <section>
                    <SectionHeader icon={Terminal} title={t('inputFormat')} />
                    <div className="bg-primary/5 rounded-lg p-6 border border-primary/10">
                        <MarkdownContent content={problem.input_format} />
                    </div>
                </section>
                <section>
                    <SectionHeader icon={Terminal} title={t('outputFormat')} />
                    <div className="bg-primary/5 rounded-lg p-6 border border-primary/10">
                        <MarkdownContent content={problem.output_format} />
                    </div>
                </section>
            </div>

            <Separator />

            {/* Samples */}
            <section className="mt-2">
                <SectionHeader icon={Terminal} title={t('samples')} />
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">{t('inputSample')}</span>
                        <div className="rounded-lg border bg-muted/50 p-4 font-mono text-sm overflow-x-auto min-h-[80px]">
                            <pre className="whitespace-pre-wrap leading-relaxed">{problem.input_sample === 'N/A' ? t('none') : problem.input_sample}</pre>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">{t('outputSample')}</span>
                        <div className="rounded-lg border bg-muted/50 p-4 font-mono text-sm overflow-x-auto min-h-[80px]">
                            <pre className="whitespace-pre-wrap leading-relaxed">{problem.output_sample === 'N/A' ? t('none') : problem.output_sample}</pre>
                        </div>
                    </div>
                </div>
            </section>

            {/* Notes */}
            {problem.notes && problem.notes !== 'N/A' && (
                <>
                    <Separator />
                    <section>
                        <SectionHeader icon={FileText} title={t('notes')} />
                        <div className="bg-amber-500/10 rounded-lg p-6 border border-amber-500/20">
                            <MarkdownContent content={problem.notes} />
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
