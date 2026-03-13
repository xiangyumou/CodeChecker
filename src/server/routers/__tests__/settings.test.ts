import { settingsRouter } from '../settings';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';

// Mock db
const mockDb = {
    select: vi.fn(() => mockDb),
    from: vi.fn(() => mockDb),
    where: vi.fn(() => mockDb),
    limit: vi.fn(() => mockDb),
    insert: vi.fn(() => mockDb),
    values: vi.fn(() => mockDb),
    returning: vi.fn(() => mockDb),
    update: vi.fn(() => mockDb),
    set: vi.fn(() => mockDb),
    delete: vi.fn(() => mockDb),
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
        return settingsRouter.createCaller({ db: mockDb as unknown as any, headers });
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset chain mocks
        mockDb.select.mockReturnValue(mockDb);
        mockDb.from.mockReturnValue(mockDb);
        mockDb.where.mockReturnValue(mockDb);
        mockDb.limit.mockReturnValue(mockDb);
        mockDb.insert.mockReturnValue(mockDb);
        mockDb.values.mockReturnValue(mockDb);
        mockDb.returning.mockReturnValue(mockDb);
        mockDb.update.mockReturnValue(mockDb);
        mockDb.set.mockReturnValue(mockDb);
        mockDb.delete.mockReturnValue(mockDb);
    });

    describe('getAll', () => {
        it('returns all settings for admin', async () => {
            const mockSettings = [
                { key: 'OPENAI_MODEL', value: 'gpt-4' },
                { key: 'MAX_RETRY', value: '3' },
            ];
            mockDb.select.mockReturnValue(mockDb);
            mockDb.from.mockResolvedValue(mockSettings);

            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.getAll();

            expect(result).toEqual({
                OPENAI_MODEL: 'gpt-4',
                MAX_RETRY: '3',
            });
        });

        it('returns empty object when no settings exist', async () => {
            mockDb.from.mockResolvedValue([]);

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
            mockDb.limit.mockResolvedValue([{ key: 'test', value: 'value' }]);

            const caller = createCaller(SETTINGS_TOKEN); // admin
            const result = await caller.getByKey('test');

            expect(result).toBe('value');
        });

        it('returns null if setting not found', async () => {
            mockDb.limit.mockResolvedValue([]);
            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.getByKey('missing');
            expect(result).toBeNull();
        });
    });

    describe('upsert', () => {
        it('updates existing setting for admin', async () => {
            // First check if exists
            mockDb.limit.mockResolvedValueOnce([{ key: 'k', value: 'old' }]);
            // Then update
            mockDb.returning.mockResolvedValueOnce([{ key: 'k', value: 'v' }]);

            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.upsert({ key: 'k', value: 'v' });

            expect(result).toEqual({ key: 'k', value: 'v' });
        });

        it('creates new setting when key does not exist', async () => {
            // First check if exists - not found
            mockDb.limit.mockResolvedValueOnce([]);
            // Then create
            mockDb.returning.mockResolvedValueOnce([{ key: 'NEW_KEY', value: 'new_value' }]);

            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.upsert({ key: 'NEW_KEY', value: 'new_value' });

            expect(mockDb.insert).toHaveBeenCalled();
            expect(result.key).toBe('NEW_KEY');
        });

        it('throws validation error if key is empty', async () => {
            const caller = createCaller(SETTINGS_TOKEN);
            await expect(caller.upsert({ key: '', value: 'val' })).rejects.toThrow();
        });
    });

    describe('batchUpdate', () => {
        it('updates multiple settings for admin', async () => {
            // First setting exists
            mockDb.limit.mockResolvedValueOnce([{ key: 'k1', value: 'old1' }]);
            mockDb.returning.mockResolvedValueOnce([{ key: 'k1', value: 'v1' }]);
            // Second setting exists
            mockDb.limit.mockResolvedValueOnce([{ key: 'k2', value: 'old2' }]);
            mockDb.returning.mockResolvedValueOnce([{ key: 'k2', value: 'v2' }]);

            const caller = createCaller(SETTINGS_TOKEN);
            await caller.batchUpdate([
                { key: 'k1', value: 'v1' },
                { key: 'k2', value: 'v2' },
            ]);

            expect(mockDb.update).toHaveBeenCalledTimes(2);
        });

        it('handles empty array without calling upsert', async () => {
            const caller = createCaller(SETTINGS_TOKEN);
            await caller.batchUpdate([]);

            expect(mockDb.insert).not.toHaveBeenCalled();
            expect(mockDb.update).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases and Boundary Tests', () => {
        it('handles empty string value correctly', async () => {
            mockDb.limit.mockResolvedValueOnce([{ key: 'test-key', value: 'old' }]);
            mockDb.returning.mockResolvedValueOnce([{ key: 'test-key', value: '' }]);

            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.upsert({ key: 'test-key', value: '' });

            expect(result.value).toBe('');
        });

        it('handles values with special characters', async () => {
            const specialValue = '{"json": true, "chars": "<>&\\""}';
            mockDb.limit.mockResolvedValueOnce([{ key: 'json-key', value: 'old' }]);
            mockDb.returning.mockResolvedValueOnce([{ key: 'json-key', value: specialValue }]);

            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.upsert({ key: 'json-key', value: specialValue });

            expect(result.value).toBe(specialValue);
        });

        it('handles whitespace-only value', async () => {
            mockDb.limit.mockResolvedValueOnce([{ key: 'ws-key', value: 'old' }]);
            mockDb.returning.mockResolvedValueOnce([{ key: 'ws-key', value: '   ' }]);

            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.upsert({ key: 'ws-key', value: '   ' });

            // Should preserve whitespace
            expect(result.value).toBe('   ');
        });

        it('getByKey returns null for non-existent key', async () => {
            mockDb.limit.mockResolvedValue([]);

            const caller = createCaller(SETTINGS_TOKEN);
            const result = await caller.getByKey('non-existent-key');

            expect(result).toBeNull();
        });
    });
});
