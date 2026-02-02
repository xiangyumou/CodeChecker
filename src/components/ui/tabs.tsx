"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{
  activeTab: string
  layoutId: string
} | null>(null)

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const [activeTab, setActiveTab] = React.useState(value || defaultValue || "")
  const uniqueId = React.useId()
  const layoutId = `tabs-${uniqueId}`

  // Sync internal state with controlled value prop if provided
  React.useEffect(() => {
    if (value !== undefined) {
      setActiveTab(value)
    }
  }, [value])

  const handleValueChange = (val: string) => {
    if (value === undefined) {
      setActiveTab(val)
    }
    onValueChange?.(val)
  }

  return (
    <TabsContext.Provider value={{ activeTab, layoutId }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        className={cn("flex flex-col gap-2", className)}
        {...props}
      />
    </TabsContext.Provider>
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-surface2 text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[var(--space-xs)]",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  value,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const context = React.useContext(TabsContext)
  const isActive = context?.activeTab === value

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        "relative z-10 flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color] cursor-pointer",
        // Focus styles
        "focus-visible:outline focus-visible:outline-[var(--ring-width)] focus-visible:outline-ring focus-visible:outline-offset-[var(--ring-offset)]",
        // Disabled styles
        "disabled:pointer-events-none disabled:opacity-50",
        // Text colors
        "text-muted-foreground data-[state=active]:text-foreground dark:data-[state=active]:text-foreground",
        // SVG styles
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {isActive && (
        <motion.span
          layoutId={context?.layoutId || "active-tab-indicator"}
          className={cn(
            "absolute inset-0 z-[-1] rounded-md shadow-sm",
            "bg-background dark:bg-input/30 dark:border dark:border-input"
          )}
          initial={false}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
          }}
        />
      )}
      {children}
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
