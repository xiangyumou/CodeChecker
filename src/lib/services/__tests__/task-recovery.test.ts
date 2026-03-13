import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markIncompleteTasksAsFailed } from '../task-recovery';

// Use vi.hoisted to ensure mocks are created before imports
const { mockPrisma, mockLogger } = vi.hoisted(() => {
    return {
        mockPrisma: {
            request: {
                updateMany: vi.fn(),
            },
        },
        mockLogger: {
            warn: vi.fn(),
            info: vi.fn(),
            error: vi.fn(),
        },
    };
});

vi.mock('@/lib/db', () => ({
    prisma: mockPrisma,
}));

vi.mock('@/lib/logger', () => ({
    default: mockLogger,
}));

describe('task-recovery', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('markIncompleteTasksAsFailed', () => {
        it('should mark PROCESSING and QUEUED tasks as FAILED', async () => {
            mockPrisma.request.updateMany
                .mockResolvedValueOnce({ count: 2 })  // PROCESSING
                .mockResolvedValueOnce({ count: 3 }); // QUEUED

            const result = await markIncompleteTasksAsFailed();

            // Verify PROCESSING update call
            const firstCall = mockPrisma.request.updateMany.mock.calls[0][0];
            expect(firstCall.where.status).toBe('PROCESSING');
            expect(firstCall.data.status).toBe('FAILED');
            expect(firstCall.data.isSuccess).toBe(false);
            expect(firstCall.data.errorMessage).toContain('processing');

            // Verify QUEUED update call
            const secondCall = mockPrisma.request.updateMany.mock.calls[1][0];
            expect(secondCall.where.status).toBe('QUEUED');
            expect(secondCall.data.status).toBe('FAILED');
            expect(secondCall.data.isSuccess).toBe(false);
            expect(secondCall.data.errorMessage).toContain('queued');

            // Verify return value
            expect(result.processing).toBe(2);
            expect(result.queued).toBe(3);
            expect(result.total).toBe(5);
        });

        it('should log warning when tasks are marked as failed', async () => {
            mockPrisma.request.updateMany
                .mockResolvedValueOnce({ count: 5 })
                .mockResolvedValueOnce({ count: 0 });

            await markIncompleteTasksAsFailed();

            expect(mockLogger.warn).toHaveBeenCalledTimes(1);
            expect(mockLogger.info).not.toHaveBeenCalled();
        });

        it('should log info when no tasks are affected', async () => {
            mockPrisma.request.updateMany
                .mockResolvedValueOnce({ count: 0 })
                .mockResolvedValueOnce({ count: 0 });

            await markIncompleteTasksAsFailed();

            expect(mockLogger.info).toHaveBeenCalledTimes(1);
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });

        it('should return zeros and log error on DB failure', async () => {
            const error = new Error('Database connection failed');
            mockPrisma.request.updateMany.mockRejectedValueOnce(error);

            const result = await markIncompleteTasksAsFailed();

            expect(mockLogger.error).toHaveBeenCalledWith(
                { err: error },
                expect.any(String) // Don't check exact message
            );
            expect(result).toEqual({ processing: 0, queued: 0, total: 0 });
        });

        it('should never throw to allow service startup to continue', async () => {
            mockPrisma.request.updateMany.mockRejectedValue(new Error('Critical DB error'));

            // Must resolve, not reject
            const result = await markIncompleteTasksAsFailed();
            expect(result).toBeDefined();
        });

        it('should handle large count values correctly', async () => {
            mockPrisma.request.updateMany
                .mockResolvedValueOnce({ count: 10000 })
                .mockResolvedValueOnce({ count: 5000 });

            const result = await markIncompleteTasksAsFailed();

            expect(result.total).toBe(15000);
            expect(result.processing).toBe(10000);
            expect(result.queued).toBe(5000);
        });

        it('should process both PROCESSING and QUEUED tasks', async () => {
            mockPrisma.request.updateMany
                .mockResolvedValueOnce({ count: 1 })
                .mockResolvedValueOnce({ count: 2 });

            await markIncompleteTasksAsFailed();

            // Verify two calls: one for PROCESSING, one for QUEUED
            expect(mockPrisma.request.updateMany).toHaveBeenCalledTimes(2);
            expect(mockPrisma.request.updateMany.mock.calls[0][0].where.status).toBe('PROCESSING');
            expect(mockPrisma.request.updateMany.mock.calls[1][0].where.status).toBe('QUEUED');
        });
    });
});
