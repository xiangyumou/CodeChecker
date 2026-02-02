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
                "flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500",
                className
            )}
            {...props}
        >
            {Icon && (
                <div className="bg-primary/5 rounded-full p-6 ring-1 ring-primary/10 mb-4 transition-transform hover:scale-105">
                    <Icon className="w-8 h-8 text-primary/60" />
                </div>
            )}
            <h3 className="text-sm font-semibold mb-1">{title}</h3>
            {description && (
                <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
                    {description}
                </p>
            )}
            {action && <div className="mt-6">{action}</div>}
        </div>
    )
}

export { EmptyState }
