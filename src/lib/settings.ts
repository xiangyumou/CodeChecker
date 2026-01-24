import { prisma } from '@/lib/db';

/**
 * Centralized settings retrieval logic
 * Falls back to environment variables if database setting is missing
 */
export async function getSetting(key: string, defaultValue?: string): Promise<string | undefined> {
    try {
        const setting = await prisma.setting.findUnique({
            where: { key }
        });
        if (setting?.value) {
            return setting.value;
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
        const settings = await prisma.setting.findMany();
        return settings.reduce((acc, setting) => {
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
