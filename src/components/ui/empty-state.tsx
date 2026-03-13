import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps extends React.ComponentProps<"div"> {
    icon?: LucideIcon
    title: string
    description?: string
    action?: React.ReactNode
}

function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
    ...props
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300",
                className
            )}
            {...props}
        >
            {Icon && (
                <Icon className="w-12 h-12 text-muted opacity-50 mb-4" />
            )}
            <div className="text-base font-medium text-text mb-1">{title}</div>
            {description && (
                <p className="text-sm text-muted max-w-[300px] leading-relaxed mb-4">
                    {description}
                </p>
            )}
            {action}
        </div>
    )
}

export { EmptyState }
