import fs from 'fs/promises';
import path from 'path';

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
 * Loads a prompt from the filesystem and caches it in memory.
 * @param name The name of the prompt file (without .md extension)
 * @returns The content of the prompt
 */
export async function getPrompt(name: string): Promise<string> {
    if (promptCache[name]) {
        return promptCache[name];
    }

    const promptPath = getPromptPath(name);
    try {
        const content = await fs.readFile(promptPath, 'utf-8');
        promptCache[name] = content;
        return content;
    } catch (error) {
        console.error(`Error reading prompt "${name}":`, error);
        throw new Error(`Prompt file "${name}.md" not found in src/lib/prompts/`);
    }
}

/**
 * Clears the prompt cache. Useful for testing or hot-reloading.
 */
export function clearPromptCache() {
    Object.keys(promptCache).forEach(key => delete promptCache[key]);
}
