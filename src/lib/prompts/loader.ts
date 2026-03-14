import fs from 'fs/promises';
import path from 'path';

/**
 * Loads a prompt directly from the filesystem.
 * @param name The name of the prompt file (without .md extension)
 */
export async function getPrompt(name: string): Promise<string> {
    const promptsDir = path.join(process.cwd(), 'src/lib/prompts');
    const promptPath = path.join(promptsDir, `${name}.md`);

    try {
        const content = await fs.readFile(promptPath, 'utf-8');
        return content;
    } catch {
        throw new Error(`Prompt file "${name}.md" not found in src/lib/prompts/`);
    }
}
