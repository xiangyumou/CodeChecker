'use client';

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { User, Info, Code2, FileDiff, Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";

interface RequestDetailTabsProps {
    request: any;
}

export default function RequestDetailTabs({ request }: RequestDetailTabsProps) {
    const t = useTranslations('requestDetails');

    return (
        <div className="px-6 py-3 bg-surface/50 backdrop-blur-sm">
            <TabsList className="w-full grid grid-cols-5 h-10 p-1 bg-surface2 rounded-lg border border-border">
                <TabsTrigger value="input" className="rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:shadow-sm data-[state=active]:text-primary">
                    <User className="w-3.5 h-3.5 mr-1.5" />
                    {t('userPrompt')}
                </TabsTrigger>
                
                {(request.stage1Status === 'completed' || request.status === 'COMPLETED') ? (
                    <TabsTrigger value="problem" className="rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:shadow-sm data-[state=active]:text-primary">
                        <Info className="w-3.5 h-3.5 mr-1.5" />
                        {t('problemDetails')}
                    </TabsTrigger>
                ) : (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="opacity-50 flex items-center justify-center text-xs font-bold text-muted-foreground cursor-not-allowed">
                                <Info className="w-3.5 h-3.5 mr-1.5" />
                                {t('problemDetails')}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>完成阶段 1 后解锁</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {(request.stage2Status === 'completed' || request.status === 'COMPLETED') ? (
                    <TabsTrigger value="code" className="rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:shadow-sm data-[state=active]:text-primary">
                        <Code2 className="w-3.5 h-3.5 mr-1.5" />
                        {t('sourceCode')}
                    </TabsTrigger>
                ) : (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="opacity-50 flex items-center justify-center text-xs font-bold text-muted-foreground cursor-not-allowed">
                                <Code2 className="w-3.5 h-3.5 mr-1.5" />
                                {t('sourceCode')}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>完成阶段 2 后解锁</p>
                        </TooltipContent>
                    </Tooltip>
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
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="opacity-50 flex items-center justify-center text-xs font-bold text-muted-foreground cursor-not-allowed">
                                    <FileDiff className="w-3.5 h-3.5 mr-1.5" />
                                    {t('codeDiff')}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>分析完成后查看</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="opacity-50 flex items-center justify-center text-xs font-bold text-muted-foreground cursor-not-allowed">
                                    <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                                    {t('analysisDetails')}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>分析完成后查看</p>
                            </TooltipContent>
                        </Tooltip>
                    </>
                )}
            </TabsList>
        </div>
    );
}
