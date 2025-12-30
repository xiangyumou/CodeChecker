import { settingsRouter } from '../settings';
import { prisma } from '@/lib/db';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
    prisma: {
        setting: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            upsert: vi.fn(),
        },
    },
}));

describe('settingsRouter', () => {
    const mockPrisma = vi.mocked(prisma);
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
        return settingsRouter.createCaller({ prisma: mockPrisma, headers } as any);
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
            mockPrisma.setting.findMany.mockResolvedValue(mockSettings as any);

            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.getAll();

            expect(result).toEqual({
                OPENAI_MODEL: 'gpt-4',
                MAX_RETRY: '3',
            });
            expect(mockPrisma.setting.findMany).toHaveBeenCalled();
        });

        it('throws UNAUTHORIZED for wrong token', async () => {
            const caller = createCaller('wrong-token');
            await expect(caller.getAll()).rejects.toThrow('UNAUTHORIZED');
        });
    });

    describe('getByKey', () => {
        it('returns setting value for valid key', async () => {
            mockPrisma.setting.findUnique.mockResolvedValue({ key: 'test', value: 'value' } as any);

            const caller = createCaller(); // public
            const result = await caller.getByKey('test');

            expect(result).toBe('value');
            expect(mockPrisma.setting.findUnique).toHaveBeenCalledWith({
                where: { key: 'test' },
            });
        });

        it('returns null if setting not found', async () => {
            mockPrisma.setting.findUnique.mockResolvedValue(null);
            const caller = createCaller();
            const result = await caller.getByKey('missing');
            expect(result).toBeNull();
        });
    });

    describe('upsert', () => {
        it('updates setting for admin', async () => {
            mockPrisma.setting.upsert.mockResolvedValue({ key: 'k', value: 'v' } as any);

            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.upsert({ key: 'k', value: 'v' });

            expect(result).toEqual({ key: 'k', value: 'v' });
            expect(mockPrisma.setting.upsert).toHaveBeenCalledWith({
                where: { key: 'k' },
                update: { value: 'v' },
                create: { key: 'k', value: 'v' },
            });
        });
    });

    describe('batchUpdate', () => {
        it('updates multiple settings for admin', async () => {
            mockPrisma.setting.upsert.mockResolvedValue({ key: 'any', value: 'any' } as any);

            const caller = createCaller(SETTINGS_TOKEN);
            await caller.batchUpdate([
                { key: 'k1', value: 'v1' },
                { key: 'k2', value: 'v2' },
            ]);

            expect(mockPrisma.setting.upsert).toHaveBeenCalledTimes(2);
        });
    });
});
