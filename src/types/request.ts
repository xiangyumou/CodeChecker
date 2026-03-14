// Drizzle-generated types (from schema)
import type { Request as DrizzleRequest } from '@/lib/db/schema';

// Re-export Drizzle type for use in components
export type { Request as DrizzleRequest } from '@/lib/db/schema';

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
export interface RequestData extends Omit<DrizzleRequest, 'gptRawResponse' | 'problemDetails' | 'analysisResult' | 'imageReferences'> {
    gptRawResponse: GptRawResponse | null;
    problemDetails: Record<string, unknown> | null;
    analysisResult: Record<string, unknown> | null;
    imageReferences: ImageReference[] | null;
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
