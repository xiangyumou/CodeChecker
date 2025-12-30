import { Client } from '@upstash/qstash';

// Create QStash client for sending tasks
export const qstash = new Client({
    token: process.env.QSTASH_TOKEN!,
});

// Get the base URL for webhook callbacks
export function getWebhookUrl(path: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}${path}`;
}

/**
 * Get the current concurrency limit for analysis tasks
 * Reads from database settings first, then environment variable, defaults to 3
 */
export async function getConcurrencyLimit(): Promise<number> {
    try {
        const { prisma } = await import('@/lib/db');
        const setting = await prisma.setting.findUnique({
            where: { key: 'MAX_CONCURRENT_ANALYSIS_TASKS' }
        });
        if (setting?.value) {
            const parsed = parseInt(setting.value);
            if (!isNaN(parsed) && parsed > 0) {
                return parsed;
            }
        }
    } catch (error) {
        // Fall through to environment variable
    }

    // Fallback to environment variable or default
    const envValue = process.env.MAX_CONCURRENT_ANALYSIS_TASKS;
    if (envValue) {
        const parsed = parseInt(envValue);
        if (!isNaN(parsed) && parsed > 0) {
            return parsed;
        }
    }

    return 3; // Default concurrency limit
}
