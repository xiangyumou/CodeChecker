import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';
import logger from '@/lib/logger';

const promptCache: Record<string, string> = {};

/**
 * Normalizes the prompt name and returns the absolute path to the prompt file.
 */
function getPromptPath(name: string): string {
    // Ensure we are looking in src/lib/prompts
    const promptsDir = path.join(process.cwd(), 'src/lib/prompts');
    return path.join(promptsDir, `${name}.md`);
}

/**
 * Loads a prompt directly from the filesystem, bypassing any database overrides.
 * @param name The name of the prompt file (without .md extension)
 */
export async function getPromptFromFile(name: string): Promise<string> {
    const promptPath = getPromptPath(name);
    try {
        const content = await fs.readFile(promptPath, 'utf-8');
        return content;
    } catch (error) {
        logger.error({ err: error, name }, 'Error reading prompt file');
        throw new Error(`Prompt file "${name}.md" not found in src/lib/prompts/`);
    }
}

/**
 * Loads a prompt, checking the database for overrides first, then falling back to the filesystem.
 * Caching is applied to file reads, but DB reads are fresh (or should we cache DB too? For now, let's not cache DB to allow instant updates).
 * Actually, the previous implementation cached file reads.
 */
export async function getPrompt(name: string): Promise<string> {
    // Check database first
    try {
        const setting = await prisma.setting.findUnique({
            where: { key: name },
        });
        if (setting?.value) {
            return setting.value;
        }
    } catch (error) {
        logger.warn({ err: error, name }, 'Failed to check settings for prompt, falling back to file');
    }

    // Fallback to file (cached)
    if (promptCache[name]) {
        return promptCache[name];
    }

    const content = await getPromptFromFile(name);
    promptCache[name] = content;
    return content;
}

/**
 * Clears the prompt cache. Useful for testing or hot-reloading.
 */
export function clearPromptCache() {
    Object.keys(promptCache).forEach(key => delete promptCache[key]);
}
