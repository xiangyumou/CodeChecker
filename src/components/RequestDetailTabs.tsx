'use client';

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { User, Info, Code2, FileDiff, Lightbulb } from "lucide-react";
import { translate } from "@/lib/i18n";

interface RequestDetailTabsProps {
    request: {
        status: string;
        problemDetails?: unknown;
        formattedCode?: string;
        analysisResult?: unknown;
    };
}

export default function RequestDetailTabs({ request }: RequestDetailTabsProps) {
    const hasProblemDetails = !!request.problemDetails;
    const hasCode = !!request.formattedCode;
    const isCompleted = request.status === 'COMPLETED';

    return (
        <div className="px-4 py-3 bg-surface/50 backdrop-blur-sm border-b overflow-x-auto no-scrollbar">
            <TabsList className="flex md:grid md:grid-cols-5 h-auto md:h-10 p-1 bg-surface2 rounded-lg border border-border min-w-max md:min-w-full">
                <TabsTrigger value="input" className="whitespace-nowrap rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:text-primary py-2 md:py-1.5 flex-1 md:flex-none">
                    <User className="w-3.5 h-3.5 mr-1.5" />
                    {translate('requestDetails.userPrompt')}
                </TabsTrigger>

                {hasProblemDetails ? (
                    <TabsTrigger value="problem" className="whitespace-nowrap rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:text-primary py-2 md:py-1.5 flex-1 md:flex-none">
                        <Info className="w-3.5 h-3.5 mr-1.5" />
                        {translate('requestDetails.problemDetails')}
                    </TabsTrigger>
                ) : (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="opacity-50 flex items-center justify-center text-xs font-bold text-muted-foreground cursor-not-allowed">
                                <Info className="w-3.5 h-3.5 mr-1.5" />
                                {translate('requestDetails.problemDetails')}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{translate('requestDetails.stage1UnlockHint')}</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {hasCode ? (
                    <TabsTrigger value="code" className="whitespace-nowrap rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:text-primary py-2 md:py-1.5 flex-1 md:flex-none">
                        <Code2 className="w-3.5 h-3.5 mr-1.5" />
                        {translate('requestDetails.sourceCode')}
                    </TabsTrigger>
                ) : (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="opacity-50 flex items-center justify-center text-xs font-bold text-muted-foreground cursor-not-allowed">
                                <Code2 className="w-3.5 h-3.5 mr-1.5" />
                                {translate('requestDetails.sourceCode')}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{translate('requestDetails.stage2UnlockHint')}</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {isCompleted ? (
                    <>
                        <TabsTrigger value="diff" className="whitespace-nowrap rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:text-primary py-2 md:py-1.5 flex-1 md:flex-none">
                            <FileDiff className="w-3.5 h-3.5 mr-1.5" />
                            {translate('requestDetails.codeDiff')}
                        </TabsTrigger>
                        <TabsTrigger value="analysis" className="whitespace-nowrap rounded-md text-xs font-bold transition-all data-[state=active]:bg-surface data-[state=active]:text-primary py-2 md:py-1.5 flex-1 md:flex-none">
                            <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                            {translate('requestDetails.analysisDetails')}
                        </TabsTrigger>
                    </>
                ) : (
                    <>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="opacity-50 flex items-center justify-center text-xs font-bold text-muted-foreground cursor-not-allowed">
                                    <FileDiff className="w-3.5 h-3.5 mr-1.5" />
                                    {translate('requestDetails.codeDiff')}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{translate('requestDetails.analysisUnlockHint')}</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="opacity-50 flex items-center justify-center text-xs font-bold text-muted-foreground cursor-not-allowed">
                                    <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                                    {translate('requestDetails.analysisDetails')}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{translate('requestDetails.analysisUnlockHint')}</p>
                            </TooltipContent>
                        </Tooltip>
                    </>
                )}
            </TabsList>
        </div>
    );
}
