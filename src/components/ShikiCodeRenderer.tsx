'use client';

import { useEffect, useState } from 'react';
import { createHighlighter, type Highlighter, type ShikiTransformer } from 'shiki';
import { useTheme } from 'next-themes';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

let highlighterPromise: Promise<Highlighter> | null = null;

const transformerLineNumbers: ShikiTransformer = {
    name: 'line-numbers',
    line(node, line) {
        this.addClassToHast(node, 'line');
        node.properties['data-line'] = line;
    }
};

function getHighlighter() {
    if (!highlighterPromise) {
        highlighterPromise = createHighlighter({
            themes: ['github-dark', 'github-light'],
            langs: ['cpp', 'javascript', 'typescript', 'json', 'markdown', 'python'],
        });
    }
    return highlighterPromise;
}

interface ShikiCodeRendererProps {
    code: string;
    language?: string;
    showLineNumbers?: boolean;
    className?: string;
}

export default function ShikiCodeRenderer({
    code,
    language = 'cpp',
    showLineNumbers = false,
    className
}: ShikiCodeRendererProps) {
    const [html, setHtml] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const { theme, systemTheme } = useTheme();

    const currentTheme = theme === 'system' ? systemTheme : theme;
    const shikiTheme = currentTheme === 'dark' ? 'github-dark' : 'github-light';

    useEffect(() => {
        let isMounted = true;

        async function highlight() {
            try {
                const highlighter = await getHighlighter();
                if (!isMounted) return;

                const highlightedHtml = highlighter.codeToHtml(code, {
                    lang: language,
                    theme: shikiTheme,
                    transformers: showLineNumbers ? [transformerLineNumbers] : [],
                });

                setHtml(highlightedHtml);
                setIsLoading(false);
            } catch (error) {
                console.error('Shiki highlighting failed:', error);
                if (isMounted) setIsLoading(false);
            }
        }

        highlight();
        return () => { isMounted = false; };
    }, [code, language, shikiTheme, showLineNumbers]);

    if (isLoading) {
        return <Skeleton className="w-full h-[200px] rounded-lg" />;
    }

    return (
        <div className={cn("code-block border bg-surface2 rounded-lg overflow-hidden", className)}>
            <div
                className="p-4 overflow-x-auto font-mono text-[13px] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </div>
    );
}
