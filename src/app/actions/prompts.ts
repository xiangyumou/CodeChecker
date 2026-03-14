'use server';

import { getPromptFromFile } from '@/lib/prompts/loader';

export async function getDefaultPrompt(name: string): Promise<string> {
    return getPromptFromFile(name);
}
