import { Request as PrismaRequest } from '@prisma/client';

// Re-export Prisma generated type for use in components
export type { Request as PrismaRequest } from '@prisma/client';

// Stage status type
export type StageStatusValue = 'pending' | 'processing' | 'completed' | 'failed';

// Request status type  
export type RequestStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// Modification analysis item from GPT response
export interface ModificationAnalysisItem {
    original_snippet: string;
    modified_snippet: string;
    explanation: string;
}

// GPT raw response structure
export interface GptRawResponse {
    organized_problem?: Record<string, unknown>;
    modification_analysis?: ModificationAnalysisItem[];
    [key: string]: unknown;
}

// Image reference structure
export interface ImageReference {
    url: string;
    preview?: string;
}

// Extended request type for frontend use with proper typing
export interface RequestData extends Omit<PrismaRequest, 'gptRawResponse' | 'problemDetails' | 'analysisResult' | 'imageReferences' | 'stage1Status' | 'stage2Status' | 'stage3Status'> {
    gptRawResponse: GptRawResponse | null;
    problemDetails: Record<string, unknown> | null;
    analysisResult: Record<string, unknown> | null;
    imageReferences: ImageReference[] | null;
    stage1Status: StageStatusValue | null;
    stage2Status: StageStatusValue | null;
    stage3Status: StageStatusValue | null;
}

// Type for query results that may contain request data
export interface RequestQueryData {
    status?: string;
    [key: string]: unknown;
}

// Type for request list items
export interface RequestListData {
    pages?: Array<{
        items?: Array<{
            status?: string;
            [key: string]: unknown;
        }>;
    }>;
}
