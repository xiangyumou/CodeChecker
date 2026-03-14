'use client';

import * as React from 'react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = React.forwardRef<
    React.ElementRef<typeof CollapsiblePrimitive.CollapsibleTrigger>,
    React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleTrigger>
>(({ className, children, ...props }, ref) => (
    <CollapsiblePrimitive.CollapsibleTrigger
        ref={ref}
        className={cn(
            'flex w-full items-center justify-between py-3 text-sm font-medium transition-all',
            'hover:text-primary [&[data-state=open]>svg]:rotate-180',
            className
        )}
        {...props}
    >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </CollapsiblePrimitive.CollapsibleTrigger>
));
CollapsibleTrigger.displayName = CollapsiblePrimitive.CollapsibleTrigger.displayName;

const CollapsibleContent = React.forwardRef<
    React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
    React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, children, ...props }, ref) => (
    <CollapsiblePrimitive.CollapsibleContent
        ref={ref}
        className={cn(
            'overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
            className
        )}
        {...props}
    >
        <div className="pb-4">{children}</div>
    </CollapsiblePrimitive.CollapsibleContent>
));
CollapsibleContent.displayName = CollapsiblePrimitive.CollapsibleContent.displayName;

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    className?: string;
    icon?: React.ReactNode;
}

export function CollapsibleSection({
    title,
    children,
    defaultOpen = false,
    className,
    icon,
}: CollapsibleSectionProps) {
    return (
        <Collapsible defaultOpen={defaultOpen} className={className}>
            <div className="border-b border-border">
                <CollapsibleTrigger>
                    <div className="flex items-center gap-2">
                        {icon && <span className="text-muted-foreground">{icon}</span>}
                        <span>{title}</span>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>{children}</CollapsibleContent>
            </div>
        </Collapsible>
    );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
