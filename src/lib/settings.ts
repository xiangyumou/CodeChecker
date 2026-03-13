import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Centralized settings retrieval logic
 * Falls back to environment variables if database setting is missing
 */
export async function getSetting(key: string, defaultValue?: string): Promise<string | undefined> {
    try {
        const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
        if (result[0]?.value) {
            return result[0].value;
        }
    } catch (error) {
        // Log error but don't fail, fall back to env/default
        // Using console.error to avoid circular dependency if logger uses settings (though it doesn't currently)
        console.error(`Failed to fetch setting ${key}:`, error);
    }

    return process.env[key] || defaultValue;
}

export async function getAllSettings(): Promise<Record<string, string>> {
    try {
        const allSettings = await db.select().from(settings);
        return allSettings.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {} as Record<string, string>);
    } catch (error) {
        console.error('Failed to fetch settings:', error);
        return {};
    }
}

// Type-safe accessor for common settings
export const AppSettings = {
    MAX_CONCURRENT_ANALYSIS_TASKS: 'MAX_CONCURRENT_ANALYSIS_TASKS',
    OPENAI_API_KEY: 'OPENAI_API_KEY',
    OPENAI_BASE_URL: 'OPENAI_BASE_URL',
    OPENAI_MODEL: 'OPENAI_MODEL',
    MODEL_SUPPORTS_VISION: 'MODEL_SUPPORTS_VISION',
    REQUEST_TIMEOUT_SECONDS: 'REQUEST_TIMEOUT_SECONDS',
} as const;
