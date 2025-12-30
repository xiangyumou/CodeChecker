
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPrompt, clearPromptCache } from '@/lib/prompts/loader';
import { prisma } from '@/lib/db';
import fs from 'fs/promises';

// Mock prisma
vi.mock('@/lib/db', () => ({
    prisma: {
        setting: {
            findUnique: vi.fn(),
        },
    },
}));

// Mock fs
vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(),
    }
}));

describe('Prompt Loader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearPromptCache();
    });

    it('should return DB value if present', async () => {
        (prisma.setting.findUnique as any).mockResolvedValue({ key: 'test-prompt', value: 'DB Prompt Content' });

        // We don't expect file read to be called here, but if it is, it should be mocked
        (fs.readFile as any).mockResolvedValue('File Prompt Content');

        const content = await getPrompt('test-prompt');

        expect(prisma.setting.findUnique).toHaveBeenCalledWith({ where: { key: 'test-prompt' } });
        expect(content).toBe('DB Prompt Content');
    });

    it('should fallback to file system if DB has no value', async () => {
        (prisma.setting.findUnique as any).mockResolvedValue(null);
        (fs.readFile as any).mockResolvedValue('File Prompt Content');

        const content = await getPrompt('test-prompt');

        expect(prisma.setting.findUnique).toHaveBeenCalledWith({ where: { key: 'test-prompt' } });
        expect(fs.readFile).toHaveBeenCalled();
        expect(content).toBe('File Prompt Content');
    });

    it('should handle DB errors gracefully and fallback to file', async () => {
        (prisma.setting.findUnique as any).mockRejectedValue(new Error('DB Error'));
        (fs.readFile as any).mockResolvedValue('File Prompt Content');

        const content = await getPrompt('test-prompt');

        expect(content).toBe('File Prompt Content');
    });
});
