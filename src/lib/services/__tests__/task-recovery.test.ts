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
        it('should mark PROCESSING tasks as FAILED with correct error message', async () => {
            mockPrisma.request.updateMany
                .mockResolvedValueOnce({ count: 2 }) // PROCESSING
                .mockResolvedValueOnce({ count: 0 }); // QUEUED

            const result = await markIncompleteTasksAsFailed();

            // Verify PROCESSING update is called first with correct data
            const firstCall = mockPrisma.request.updateMany.mock.calls[0][0];
            expect(firstCall.where.status).toBe('PROCESSING');
            expect(firstCall.data.status).toBe('FAILED');
            expect(firstCall.data.errorMessage).toContain('processing');
            expect(firstCall.data.isSuccess).toBe(false);

            // Verify return value matches mock count
            expect(result.processing).toBe(2);
            expect(result.queued).toBe(0);
            expect(result.total).toBe(2);
        });



        it('should only process PROCESSING tasks (not QUEUED)', async () => {
            mockPrisma.request.updateMany
                .mockResolvedValueOnce({ count: 2 });

            await markIncompleteTasksAsFailed();

            // Verify only one call for PROCESSING status
            expect(mockPrisma.request.updateMany).toHaveBeenCalledTimes(1);
            expect(mockPrisma.request.updateMany.mock.calls[0][0].where.status).toBe('PROCESSING');
        });

        it('should calculate total correctly from processing count', async () => {
            mockPrisma.request.updateMany
                .mockResolvedValueOnce({ count: 5 });

            const result = await markIncompleteTasksAsFailed();

            expect(result.total).toBe(5);
            expect(result.total).toBe(result.processing);
            expect(result.queued).toBe(0);
        });

        it('should log warning with exact counts when tasks are marked', async () => {
            mockPrisma.request.updateMany
                .mockResolvedValueOnce({ count: 1 });

            await markIncompleteTasksAsFailed();

            expect(mockLogger.warn).toHaveBeenCalledTimes(1);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.objectContaining({
                    processing: 1,
                    total: 1
                }),
                expect.stringContaining('FAILED')
            );
            // Verify info was NOT called (mutually exclusive)
            expect(mockLogger.info).not.toHaveBeenCalled();
        });

        it('should log info (not warning) when zero tasks affected', async () => {
            mockPrisma.request.updateMany
                .mockResolvedValueOnce({ count: 0 });

            await markIncompleteTasksAsFailed();

            expect(mockLogger.info).toHaveBeenCalledTimes(1);
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('No processing tasks')
            );
            // Verify warn was NOT called
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });

        it('should return zeros and log error on first DB call failure', async () => {
            const error = new Error('Database connection failed');
            mockPrisma.request.updateMany.mockRejectedValueOnce(error);

            const result = await markIncompleteTasksAsFailed();

            // Verify error was logged with the actual error object
            expect(mockLogger.error).toHaveBeenCalledWith(
                { err: error },
                expect.stringContaining('Failed to mark incomplete tasks')
            );
            // Verify all counts are zero
            expect(result).toEqual({ processing: 0, queued: 0, total: 0 });
        });



        it('should never throw to allow service startup to continue', async () => {
            mockPrisma.request.updateMany.mockRejectedValue(new Error('Critical DB error'));

            // Must resolve, not reject
            const promise = markIncompleteTasksAsFailed();
            await expect(promise).resolves.toBeDefined();
            await expect(promise).resolves.not.toThrow();
        });

        it('should handle large count values correctly', async () => {
            mockPrisma.request.updateMany
                .mockResolvedValueOnce({ count: 10000 });

            const result = await markIncompleteTasksAsFailed();

            expect(result.total).toBe(10000);
            expect(result.processing).toBe(10000);
            expect(result.queued).toBe(0);
            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });
});
