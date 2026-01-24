'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
    children: string;
    className?: string;
}

/**
 * Unified Markdown renderer with GFM, Math, and KaTeX support.
 * Use this component instead of directly using ReactMarkdown to ensure
 * consistent configuration across the application.
 */
export default function MarkdownRenderer({ children, className }: MarkdownRendererProps) {
    return (
        <div className={cn('prose dark:prose-invert max-w-none', className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
            >
                {children}
            </ReactMarkdown>
        </div>
    );
}
