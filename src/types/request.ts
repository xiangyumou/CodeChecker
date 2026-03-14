// 简化的类型定义 - 直接使用 Drizzle 生成的类型

import type { Request } from '@/lib/db/schema';

// Re-export Drizzle type
export type { Request };

// Request status type
export type RequestStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// Modification analysis item from GPT response
export interface ModificationAnalysisItem {
    original_snippet: string;
    modified_snippet: string;
    explanation: string;
}

// Image reference structure
export interface ImageReference {
    url: string;
    preview?: string;
}
