import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markIncompleteTasksAsFailed } from '../task-recovery';

// Use vi.hoisted to ensure mocks are created before imports
const { mockDb, mockLogger } = vi.hoisted(() => {
    return {
        mockDb: {
            update: vi.fn(() => mockDb),
            set: vi.fn(() => mockDb),
            where: vi.fn(() => mockDb),
        },
        mockLogger: {
            warn: vi.fn(),
            info: vi.fn(),
            error: vi.fn(),
        },
    };
});

vi.mock('@/lib/db', () => ({
    db: mockDb,
}));

vi.mock('@/lib/logger', () => ({
    default: mockLogger,
}));

describe('task-recovery', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        // Reset chain mocks
        mockDb.update.mockReturnValue(mockDb);
        mockDb.set.mockReturnValue(mockDb);
        mockDb.where.mockReturnValue({ changes: 0 });
    });

    describe('markIncompleteTasksAsFailed', () => {
        it('should mark PROCESSING and QUEUED tasks as FAILED', async () => {
            mockDb.where
                .mockResolvedValueOnce({ changes: 2 })  // PROCESSING
                .mockResolvedValueOnce({ changes: 3 }); // QUEUED

            const result = await markIncompleteTasksAsFailed();

            // Verify PROCESSING update call
            expect(mockDb.update).toHaveBeenCalledTimes(2);

            // Verify return value
            expect(result.processing).toBe(2);
            expect(result.queued).toBe(3);
            expect(result.total).toBe(5);
        });

        it('should log warning when tasks are marked as failed', async () => {
            mockDb.where
                .mockResolvedValueOnce({ changes: 5 })
                .mockResolvedValueOnce({ changes: 0 });

            await markIncompleteTasksAsFailed();

            expect(mockLogger.warn).toHaveBeenCalledTimes(1);
            expect(mockLogger.info).not.toHaveBeenCalled();
        });

        it('should log info when no tasks are affected', async () => {
            mockDb.where
                .mockResolvedValueOnce({ changes: 0 })
                .mockResolvedValueOnce({ changes: 0 });

            await markIncompleteTasksAsFailed();

            expect(mockLogger.info).toHaveBeenCalledTimes(1);
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });

        it('should return zeros and log error on DB failure', async () => {
            const error = new Error('Database connection failed');
            // Make the chain reject at the where() call
            mockDb.where.mockRejectedValueOnce(error);

            const result = await markIncompleteTasksAsFailed();

            expect(mockLogger.error).toHaveBeenCalledWith(
                { err: error },
                expect.any(String) // Don't check exact message
            );
            expect(result).toEqual({ processing: 0, queued: 0, total: 0 });
        });

        it('should never throw to allow service startup to continue', async () => {
            mockDb.set.mockRejectedValue(new Error('Critical DB error'));

            // Must resolve, not reject
            const result = await markIncompleteTasksAsFailed();
            expect(result).toBeDefined();
        });

        it('should handle large count values correctly', async () => {
            mockDb.where
                .mockResolvedValueOnce({ changes: 10000 })
                .mockResolvedValueOnce({ changes: 5000 });

            const result = await markIncompleteTasksAsFailed();

            expect(result.total).toBe(15000);
            expect(result.processing).toBe(10000);
            expect(result.queued).toBe(5000);
        });

        it('should process both PROCESSING and QUEUED tasks', async () => {
            mockDb.where
                .mockResolvedValueOnce({ changes: 1 })
                .mockResolvedValueOnce({ changes: 2 });

            await markIncompleteTasksAsFailed();

            // Verify two calls: one for PROCESSING, one for QUEUED
            expect(mockDb.update).toHaveBeenCalledTimes(2);
        });
    });
});
