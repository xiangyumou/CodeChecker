import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPrompt } from '@/lib/prompts/loader';
import fs from 'fs/promises';

// Mock fs
vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(),
    }
}));

describe('Prompt Loader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should read prompt from file', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fs.readFile as unknown as any).mockResolvedValue('Test Prompt Content');

        const content = await getPrompt('test-prompt');

        expect(fs.readFile).toHaveBeenCalled();
        expect(content).toBe('Test Prompt Content');
    });

    it('should throw error if file not found', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fs.readFile as unknown as any).mockRejectedValue(new Error('File not found'));

        await expect(getPrompt('non-existent')).rejects.toThrow('Prompt file "non-existent.md" not found');
    });

    it('should read correct file path', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fs.readFile as unknown as any).mockResolvedValue('Content');

        await getPrompt('analysis');

        expect(fs.readFile).toHaveBeenCalledWith(
            expect.stringContaining('src/lib/prompts/analysis.md'),
            'utf-8'
        );
    });
});
