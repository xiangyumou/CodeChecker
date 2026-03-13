import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPrompt, clearPromptCache } from '@/lib/prompts/loader';
import { db } from '@/lib/db';
import fs from 'fs/promises';

// Mock db
vi.mock('@/lib/db', () => ({
    db: {
        select: vi.fn(() => db),
        from: vi.fn(() => db),
        where: vi.fn(() => db),
        limit: vi.fn(() => db),
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
        // Reset chain mocks
        db.select.mockReturnValue(db);
        db.from.mockReturnValue(db);
        db.where.mockReturnValue(db);
        db.limit.mockReturnValue(db);
    });

    it('should return DB value if present', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (db.limit as unknown as any).mockResolvedValueOnce([{ key: 'test-prompt', value: 'DB Prompt Content' }]);

        // We don't expect file read to be called here, but if it is, it should be mocked
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fs.readFile as unknown as any).mockResolvedValue('File Prompt Content');

        const content = await getPrompt('test-prompt');

        expect(content).toBe('DB Prompt Content');
    });

    it('should fallback to file system if DB has no value', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (db.limit as unknown as any).mockResolvedValueOnce([]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fs.readFile as unknown as any).mockResolvedValue('File Prompt Content');

        const content = await getPrompt('test-prompt');

        expect(fs.readFile).toHaveBeenCalled();
        expect(content).toBe('File Prompt Content');
    });

    it('should handle DB errors gracefully and fallback to file', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (db.where as unknown as any).mockRejectedValueOnce(new Error('DB Error'));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fs.readFile as unknown as any).mockResolvedValue('File Prompt Content');

        const content = await getPrompt('test-prompt');

        expect(content).toBe('File Prompt Content');
    });

    it('should always query DB (DB values are not cached for real-time updates)', async () => {
        // The implementation intentionally does NOT cache DB values to allow instant updates
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (db.limit as unknown as any).mockResolvedValue([{ key: 'db-prompt', value: 'DB Content' }]);

        // First call
        const firstCall = await getPrompt('db-prompt');
        expect(firstCall).toBe('DB Content');

        // Second call - should query DB again (not cached)
        const secondCall = await getPrompt('db-prompt');
        expect(secondCall).toBe('DB Content');
    });

    it('should cache file fallback values after first read', async () => {
        // When DB returns null, we fall back to file and cache it
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (db.limit as unknown as any).mockResolvedValue([]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fs.readFile as unknown as any).mockResolvedValue('Cached File Content');

        // First call - hits DB then file
        const firstCall = await getPrompt('file-prompt');
        expect(firstCall).toBe('Cached File Content');
        expect(fs.readFile).toHaveBeenCalledTimes(1);

        // Second call - DB still queried (not cached), but file cached
        vi.clearAllMocks();
        db.select.mockReturnValue(db);
        db.from.mockReturnValue(db);
        db.where.mockReturnValue(db);
        db.limit.mockReturnValue(db);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (db.limit as unknown as any).mockResolvedValue([]);

        const secondCall = await getPrompt('file-prompt');
        expect(secondCall).toBe('Cached File Content');
        // File should NOT be read again due to cache
        expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('should clear file cache when clearPromptCache is called', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (db.limit as unknown as any).mockResolvedValue([]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fs.readFile as unknown as any).mockResolvedValue('Content');

        // First call - caches file content
        await getPrompt('test-prompt');
        expect(fs.readFile).toHaveBeenCalledTimes(1);

        // Clear cache
        clearPromptCache();

        // Reset mocks
        vi.clearAllMocks();
        db.select.mockReturnValue(db);
        db.from.mockReturnValue(db);
        db.where.mockReturnValue(db);
        db.limit.mockReturnValue(db);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (db.limit as unknown as any).mockResolvedValue([]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fs.readFile as unknown as any).mockResolvedValue('Content');

        // Second call after cache clear - should read file again
        await getPrompt('test-prompt');
        expect(fs.readFile).toHaveBeenCalledTimes(1);
    });
});
