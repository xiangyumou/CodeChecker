
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma.setting.findUnique as unknown as any).mockResolvedValue({ key: 'test-prompt', value: 'DB Prompt Content' });

        // We don't expect file read to be called here, but if it is, it should be mocked
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fs.readFile as unknown as any).mockResolvedValue('File Prompt Content');

        const content = await getPrompt('test-prompt');

        expect(prisma.setting.findUnique).toHaveBeenCalledWith({ where: { key: 'test-prompt' } });
        expect(content).toBe('DB Prompt Content');
    });

    it('should fallback to file system if DB has no value', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma.setting.findUnique as unknown as any).mockResolvedValue(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fs.readFile as unknown as any).mockResolvedValue('File Prompt Content');

        const content = await getPrompt('test-prompt');

        expect(prisma.setting.findUnique).toHaveBeenCalledWith({ where: { key: 'test-prompt' } });
        expect(fs.readFile).toHaveBeenCalled();
        expect(content).toBe('File Prompt Content');
    });

    it('should handle DB errors gracefully and fallback to file', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma.setting.findUnique as unknown as any).mockRejectedValue(new Error('DB Error'));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fs.readFile as unknown as any).mockResolvedValue('File Prompt Content');

        const content = await getPrompt('test-prompt');

        expect(content).toBe('File Prompt Content');
    });

    it('should always query DB (DB values are not cached for real-time updates)', async () => {
        // The implementation intentionally does NOT cache DB values to allow instant updates
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma.setting.findUnique as unknown as any).mockResolvedValue({ key: 'db-prompt', value: 'DB Content' });

        // First call
        const firstCall = await getPrompt('db-prompt');
        expect(firstCall).toBe('DB Content');
        expect(prisma.setting.findUnique).toHaveBeenCalledTimes(1);

        // Second call - should query DB again (not cached)
        const secondCall = await getPrompt('db-prompt');
        expect(secondCall).toBe('DB Content');
        expect(prisma.setting.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should cache file fallback values after first read', async () => {
        // When DB returns null, we fall back to file and cache it
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma.setting.findUnique as unknown as any).mockResolvedValue(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fs.readFile as unknown as any).mockResolvedValue('Cached File Content');

        // First call - hits DB then file
        const firstCall = await getPrompt('file-prompt');
        expect(firstCall).toBe('Cached File Content');
        expect(fs.readFile).toHaveBeenCalledTimes(1);

        // Second call - DB still queried (not cached), but file cached
        const secondCall = await getPrompt('file-prompt');
        expect(secondCall).toBe('Cached File Content');
        // File should NOT be read again due to cache
        expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should clear file cache when clearPromptCache is called', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma.setting.findUnique as unknown as any).mockResolvedValue(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fs.readFile as unknown as any).mockResolvedValue('Content');

        // First call - caches file content
        await getPrompt('test-prompt');
        expect(fs.readFile).toHaveBeenCalledTimes(1);

        // Clear cache
        clearPromptCache();

        // Second call after cache clear - should read file again
        await getPrompt('test-prompt');
        expect(fs.readFile).toHaveBeenCalledTimes(2);
    });
});
