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
        it('should mark PROCESSING tasks as FAILED with correct status and error message', async () => {
            mockPrisma.request.updateMany.mockResolvedValueOnce({ count: 2 });

            const result = await markIncompleteTasksAsFailed();

            // Verify the update call
            const firstCall = mockPrisma.request.updateMany.mock.calls[0][0];
            expect(firstCall.where.status).toBe('PROCESSING');
            expect(firstCall.data.status).toBe('FAILED');
            expect(firstCall.data.isSuccess).toBe(false);
            expect(firstCall.data.errorMessage).toContain('processing');

            // Verify return value
            expect(result.processing).toBe(2);
            expect(result.total).toBe(2);
        });

        it('should log warning when tasks are marked as failed', async () => {
            mockPrisma.request.updateMany.mockResolvedValueOnce({ count: 5 });

            await markIncompleteTasksAsFailed();

            expect(mockLogger.warn).toHaveBeenCalledTimes(1);
            expect(mockLogger.info).not.toHaveBeenCalled();
        });

        it('should log info when no tasks are affected', async () => {
            mockPrisma.request.updateMany.mockResolvedValueOnce({ count: 0 });

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
            mockPrisma.request.updateMany.mockResolvedValueOnce({ count: 10000 });

            const result = await markIncompleteTasksAsFailed();

            expect(result.total).toBe(10000);
            expect(result.processing).toBe(10000);
        });

        it('should only process PROCESSING tasks (not QUEUED)', async () => {
            mockPrisma.request.updateMany.mockResolvedValueOnce({ count: 1 });

            await markIncompleteTasksAsFailed();

            // Verify only one call for PROCESSING status
            expect(mockPrisma.request.updateMany).toHaveBeenCalledTimes(1);
            expect(mockPrisma.request.updateMany.mock.calls[0][0].where.status).toBe('PROCESSING');
        });
    });
});
