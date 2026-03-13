import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { requestsRouter } from '../requests';
import { TRPCError } from '@trpc/server';

const { mockAddAnalysisTask } = vi.hoisted(() => {
    return {
        mockAddAnalysisTask: vi.fn(() => Promise.resolve()),
    };
});

// Mock dependencies
const mockDb = {
    select: vi.fn(() => mockDb),
    from: vi.fn(() => mockDb),
    where: vi.fn(() => mockDb),
    limit: vi.fn(() => mockDb),
    orderBy: vi.fn(() => mockDb),
    offset: vi.fn(() => mockDb),
    insert: vi.fn(() => mockDb),
    values: vi.fn(() => mockDb),
    returning: vi.fn(() => mockDb),
    update: vi.fn(() => mockDb),
    set: vi.fn(() => mockDb),
    delete: vi.fn(() => mockDb),
};

vi.mock('@/lib/queue/memory-queue', () => ({
    addAnalysisTask: mockAddAnalysisTask,
}));

describe('requestsRouter', () => {
    // Create caller with mocked context
    const SETTINGS_TOKEN = 'test-admin-token';
    const originalEnv = process.env.SETTINGS_TOKEN;

    beforeAll(() => {
        process.env.SETTINGS_TOKEN = SETTINGS_TOKEN;
    });

    afterAll(() => {
        process.env.SETTINGS_TOKEN = originalEnv;
    });

    // Create caller with admin token
    const headers = new Headers();
    headers.set('x-admin-token', SETTINGS_TOKEN);

    const caller = requestsRouter.createCaller({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        db: mockDb as unknown as any,
        headers,
    });

    beforeEach(() => {
        vi.resetAllMocks();
        // Reset chain mocks
        mockDb.select.mockReturnValue(mockDb);
        mockDb.from.mockReturnValue(mockDb);
        mockDb.where.mockReturnValue(mockDb);
        mockDb.limit.mockReturnValue(mockDb);
        mockDb.orderBy.mockReturnValue(mockDb);
        mockDb.offset.mockReturnValue(mockDb);
        mockDb.insert.mockReturnValue(mockDb);
        mockDb.values.mockReturnValue(mockDb);
        mockDb.returning.mockReturnValue(mockDb);
        mockDb.update.mockReturnValue(mockDb);
        mockDb.set.mockReturnValue(mockDb);
        mockDb.delete.mockReturnValue(mockDb);
    });

    describe('getById', () => {
        it('should return request by id', async () => {
            const mockRequest = {
                id: 1,
                imageReferences: ["img1"],
                gptRawResponse: { foo: "bar" }
            };
            mockDb.limit.mockResolvedValueOnce([mockRequest]);

            const result = await caller.getById(1);

            expect(result).toMatchObject({
                id: 1,
                imageReferences: ['img1'],
                gptRawResponse: { foo: 'bar' },
            });
        });

        it('should throw NOT_FOUND when request not found', async () => {
            mockDb.limit.mockResolvedValueOnce([]);
            await expect(caller.getById(999)).rejects.toThrow(TRPCError);
        });
    });

    describe('create', () => {
        it('should create request and add to memory queue', async () => {
            const input = { userPrompt: 'Test Prompt', imageReferences: ['ref'] };
            const mockCreated = { id: 123, ...input, status: 'QUEUED' };

            mockDb.returning.mockResolvedValueOnce([mockCreated]);

            const result = await caller.create(input);

            // Verify memory queue was called (non-blocking)
            expect(mockAddAnalysisTask).toHaveBeenCalledWith(123);
            expect(result).toEqual(mockCreated);
        });

        it('should throw validation error if both userPrompt and imageReferences are missing', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await expect(caller.create({} as unknown as any)).rejects.toThrow();
        });

        it('should throw validation error if imageReferences is empty and userPrompt is missing', async () => {
            await expect(caller.create({ imageReferences: [] })).rejects.toThrow();
        });

        it('should allow imageReferences only and create request correctly', async () => {
            const input = { imageReferences: ['ref1', 'ref2'] };
            const mockCreated = { id: 124, imageReferences: ['ref1', 'ref2'], userPrompt: null, status: 'QUEUED' };

            mockDb.returning.mockResolvedValueOnce([mockCreated]);

            const result = await caller.create(input);

            // Verify memory queue was called
            expect(mockAddAnalysisTask).toHaveBeenCalledWith(124);

            // Verify return value
            expect(result.id).toBe(124);
            expect(result.status).toBe('QUEUED');
        });
    });

    describe('list', () => {
        it('should return a list of requests', async () => {
            const mockData = [{ id: 1, status: 'COMPLETED' }];
            mockDb.orderBy.mockResolvedValueOnce(mockData);

            const result = await caller.list({});

            expect(result).toEqual(mockData);
        });

        it('should throw validation error if take is less than 1', async () => {
            await expect(caller.list({ take: 0 })).rejects.toThrow();
        });

        it('should throw validation error if take is greater than 100', async () => {
            await expect(caller.list({ take: 101 })).rejects.toThrow();
        });

        it('should filter by status', async () => {
            mockDb.orderBy.mockResolvedValueOnce([]);
            await caller.list({ status: 'FAILED' });
            // Verify that where was called (we can't verify exact params easily with chained mocks)
            expect(mockDb.where).toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        it('should delete request', async () => {
            mockDb.limit.mockResolvedValueOnce([{ id: 1 }]);

            const result = await caller.delete(1);

            expect(mockDb.delete).toHaveBeenCalled();
            expect(result).toEqual({ success: true, id: 1 });
        });
    });

    describe('retry', () => {
        it('should reset request fields and add to memory queue', async () => {
            const mockRequest = { id: 1, status: 'FAILED' };
            const mockUpdated = {
                id: 1,
                status: 'QUEUED',
                isSuccess: false,
                stage1Status: 'pending'
            };

            mockDb.limit.mockResolvedValueOnce([mockRequest]);
            mockDb.returning.mockResolvedValueOnce([mockUpdated]);

            const result = await caller.retry(1);

            // Verify memory queue was called (non-blocking)
            expect(mockAddAnalysisTask).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockUpdated);
        });

        it('should throw NOT_FOUND if request does not exist', async () => {
            mockDb.limit.mockResolvedValueOnce([]);
            await expect(caller.retry(999)).rejects.toThrow(TRPCError);
        });
    });

    describe('retry (public access)', () => {
        // Create a caller without admin token
        const publicCaller = requestsRouter.createCaller({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            db: mockDb as unknown as any,
            headers: new Headers(), // No admin token
        });

        it('should allow retry without admin token', async () => {
            const mockRequest = { id: 2, status: 'FAILED' };
            const mockUpdated = {
                id: 2,
                status: 'QUEUED',
                isSuccess: false,
                stage1Status: 'pending'
            };

            mockDb.limit.mockResolvedValueOnce([mockRequest]);
            mockDb.returning.mockResolvedValueOnce([mockUpdated]);

            const result = await publicCaller.retry(2);

            // Verify memory queue was called
            expect(mockAddAnalysisTask).toHaveBeenCalledWith(2);
            expect(result.status).toBe('QUEUED');
        });
    });

    describe('prune', () => {
        it('should prune requests older than specified duration', async () => {
            // Mock date to control time
            const now = new Date('2024-01-01T12:00:00Z');
            vi.useFakeTimers();
            vi.setSystemTime(now);

            mockDb.delete.mockReturnValueOnce({ where: vi.fn() });

            // Call with 1 hour
            const result = await caller.prune({ amount: 1, unit: 'hours' });

            expect(result).toEqual({ success: true, count: 0 });

            vi.useRealTimers();
        });

        it('should return success with zero count', async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));

            const result = await caller.prune({ amount: 1, unit: 'hours' });

            expect(result).toEqual({ success: true, count: 0 });

            vi.useRealTimers();
        });
    });

    describe('clearAll', () => {
        it('should delete all requests', async () => {
            const result = await caller.clearAll();

            expect(mockDb.delete).toHaveBeenCalled();
            expect(result).toEqual({ success: true, count: 0 });
        });
    });
});
