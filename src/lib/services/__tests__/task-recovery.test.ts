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
        it('should mark PROCESSING tasks as FAILED', async () => {
            mockPrisma.request.updateMany
                .mockResolvedValueOnce({ count: 2 }) // PROCESSING
                .mockResolvedValueOnce({ count: 0 }); // QUEUED

            const result = await markIncompleteTasksAsFailed();

            expect(mockPrisma.request.updateMany).toHaveBeenCalledWith({
                where: { status: 'PROCESSING' },
                data: {
                    status: 'FAILED',
                    errorMessage: 'Service restarted while task was processing',
                    isSuccess: false,
                },
            });
            expect(result).toEqual({ processing: 2, queued: 0, total: 2 });
        });

        it('should mark QUEUED tasks as FAILED', async () => {
            mockPrisma.request.updateMany
                .mockResolvedValueOnce({ count: 0 }) // PROCESSING
                .mockResolvedValueOnce({ count: 3 }); // QUEUED

            const result = await markIncompleteTasksAsFailed();

            expect(mockPrisma.request.updateMany).toHaveBeenCalledWith({
                where: { status: 'QUEUED' },
                data: {
                    status: 'FAILED',
                    errorMessage: 'Service restarted before task could be processed',
                    isSuccess: false,
                },
            });
            expect(result).toEqual({ processing: 0, queued: 3, total: 3 });
        });

        it('should mark both PROCESSING and QUEUED tasks as FAILED', async () => {
            mockPrisma.request.updateMany
                .mockResolvedValueOnce({ count: 2 }) // PROCESSING
                .mockResolvedValueOnce({ count: 3 }); // QUEUED

            const result = await markIncompleteTasksAsFailed();

            expect(mockPrisma.request.updateMany).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ processing: 2, queued: 3, total: 5 });
        });

        it('should log warning when tasks are marked as failed', async () => {
            mockPrisma.request.updateMany
                .mockResolvedValueOnce({ count: 1 })
                .mockResolvedValueOnce({ count: 2 });

            await markIncompleteTasksAsFailed();

            expect(mockLogger.warn).toHaveBeenCalledWith(
                { processing: 1, queued: 2, total: 3 },
                'Marked incomplete tasks as FAILED due to service restart'
            );
        });

        it('should log info when no incomplete tasks found', async () => {
            mockPrisma.request.updateMany
                .mockResolvedValueOnce({ count: 0 })
                .mockResolvedValueOnce({ count: 0 });

            await markIncompleteTasksAsFailed();

            expect(mockLogger.info).toHaveBeenCalledWith(
                'No incomplete tasks found on service startup'
            );
        });

        it('should handle errors gracefully and return zeros', async () => {
            const error = new Error('Database connection failed');
            mockPrisma.request.updateMany.mockRejectedValueOnce(error);

            const result = await markIncompleteTasksAsFailed();

            expect(mockLogger.error).toHaveBeenCalledWith(
                { err: error },
                'Failed to mark incomplete tasks as failed'
            );
            expect(result).toEqual({ processing: 0, queued: 0, total: 0 });
        });

        it('should not throw errors even if database fails', async () => {
            mockPrisma.request.updateMany.mockRejectedValue(new Error('DB error'));

            await expect(markIncompleteTasksAsFailed()).resolves.not.toThrow();
        });
    });
});
