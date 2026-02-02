import { settingsRouter } from '../settings';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';


// Mock Prisma
const mockPrisma = {
    setting: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
    },
};

describe('settingsRouter', () => {
    const SETTINGS_TOKEN = 'test-token';
    const originalEnv = process.env.SETTINGS_TOKEN;

    beforeAll(() => {
        process.env.SETTINGS_TOKEN = SETTINGS_TOKEN;
    });

    afterAll(() => {
        process.env.SETTINGS_TOKEN = originalEnv;
    });

    const createCaller = (token?: string) => {
        const headers = new Headers();
        if (token) headers.set('x-admin-token', token);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return settingsRouter.createCaller({ prisma: mockPrisma, headers } as unknown as any);
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getAll', () => {
        it('returns all settings for admin', async () => {
            const mockSettings = [
                { key: 'OPENAI_MODEL', value: 'gpt-4' },
                { key: 'MAX_RETRY', value: '3' },
            ];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockPrisma.setting.findMany.mockResolvedValue(mockSettings as unknown as any);

            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.getAll();

            expect(result).toEqual({
                OPENAI_MODEL: 'gpt-4',
                MAX_RETRY: '3',
            });
            expect(mockPrisma.setting.findMany).toHaveBeenCalled();
        });

        it('returns empty object when no settings exist', async () => {
            mockPrisma.setting.findMany.mockResolvedValue([]);

            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.getAll();

            expect(result).toEqual({});
        });

        // Auth tests - different procedure than security.test.ts (getAll vs getByKey)
        it('throws UNAUTHORIZED for wrong token', async () => {
            const caller = createCaller('wrong-token');
            await expect(caller.getAll()).rejects.toThrow('UNAUTHORIZED');
        });

        it('throws UNAUTHORIZED when no token provided', async () => {
            const caller = createCaller(); // no token
            await expect(caller.getAll()).rejects.toThrow('UNAUTHORIZED');
        });
    });

    describe('getByKey', () => {
        it('returns setting value for valid key', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockPrisma.setting.findUnique.mockResolvedValue({ key: 'test', value: 'value' } as unknown as any);

            const caller = createCaller(SETTINGS_TOKEN); // admin
            const result = await caller.getByKey('test');

            expect(result).toBe('value');
            expect(mockPrisma.setting.findUnique).toHaveBeenCalledWith({
                where: { key: 'test' },
            });
        });

        it('returns null if setting not found', async () => {
            mockPrisma.setting.findUnique.mockResolvedValue(null);
            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.getByKey('missing');
            expect(result).toBeNull();
        });
    });

    describe('upsert', () => {
        it('updates existing setting for admin', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockPrisma.setting.upsert.mockResolvedValue({ key: 'k', value: 'v' } as unknown as any);

            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.upsert({ key: 'k', value: 'v' });

            expect(result).toEqual({ key: 'k', value: 'v' });
            expect(mockPrisma.setting.upsert).toHaveBeenCalledWith({
                where: { key: 'k' },
                update: { value: 'v' },
                create: { key: 'k', value: 'v' },
            });
        });

        it('creates new setting when key does not exist', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockPrisma.setting.upsert.mockResolvedValue({ key: 'NEW_KEY', value: 'new_value' } as unknown as any);

            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.upsert({ key: 'NEW_KEY', value: 'new_value' });

            // Verify upsert is called with both create and update params
            expect(mockPrisma.setting.upsert).toHaveBeenCalledWith({
                where: { key: 'NEW_KEY' },
                update: { value: 'new_value' },
                create: { key: 'NEW_KEY', value: 'new_value' },
            });
            expect(result.key).toBe('NEW_KEY');
        });

        it('throws validation error if key is empty', async () => {
            const caller = createCaller(SETTINGS_TOKEN);
            await expect(caller.upsert({ key: '', value: 'val' })).rejects.toThrow();
        });
    });

    describe('batchUpdate', () => {
        it('updates multiple settings for admin', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockPrisma.setting.upsert.mockResolvedValue({ key: 'any', value: 'any' } as unknown as any);

            const caller = createCaller(SETTINGS_TOKEN);
            await caller.batchUpdate([
                { key: 'k1', value: 'v1' },
                { key: 'k2', value: 'v2' },
            ]);

            expect(mockPrisma.setting.upsert).toHaveBeenCalledTimes(2);
        });

        it('calls upsert with correct parameters for each setting', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockPrisma.setting.upsert.mockResolvedValue({ key: 'any', value: 'any' } as unknown as any);

            const caller = createCaller(SETTINGS_TOKEN);
            await caller.batchUpdate([
                { key: 'k1', value: 'v1' },
                { key: 'k2', value: 'v2' },
            ]);

            // Verify first call
            expect(mockPrisma.setting.upsert).toHaveBeenNthCalledWith(1, {
                where: { key: 'k1' },
                update: { value: 'v1' },
                create: { key: 'k1', value: 'v1' },
            });

            // Verify second call
            expect(mockPrisma.setting.upsert).toHaveBeenNthCalledWith(2, {
                where: { key: 'k2' },
                update: { value: 'v2' },
                create: { key: 'k2', value: 'v2' },
            });
        });

        it('handles empty array without calling upsert', async () => {
            const caller = createCaller(SETTINGS_TOKEN);
            await caller.batchUpdate([]);

            expect(mockPrisma.setting.upsert).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases and Boundary Tests', () => {
        it('handles empty string value correctly', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockPrisma.setting.upsert.mockResolvedValue({ key: 'test-key', value: '' } as unknown as any);

            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.upsert({ key: 'test-key', value: '' });

            expect(result.value).toBe('');
            expect(mockPrisma.setting.upsert).toHaveBeenCalledWith({
                where: { key: 'test-key' },
                update: { value: '' },
                create: { key: 'test-key', value: '' },
            });
        });

        it('handles values with special characters', async () => {
            const specialValue = '{"json": true, "chars": "<>&\\""}';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockPrisma.setting.upsert.mockResolvedValue({ key: 'json-key', value: specialValue } as unknown as any);

            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.upsert({ key: 'json-key', value: specialValue });

            expect(result.value).toBe(specialValue);
        });

        it('handles whitespace-only value', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockPrisma.setting.upsert.mockResolvedValue({ key: 'ws-key', value: '   ' } as unknown as any);

            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.upsert({ key: 'ws-key', value: '   ' });

            // Should preserve whitespace
            expect(result.value).toBe('   ');
        });

        it('getByKey returns null for non-existent key', async () => {
            mockPrisma.setting.findUnique.mockResolvedValue(null);

            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.getByKey('non-existent-key');

            expect(result).toBeNull();
        });
    });
});
