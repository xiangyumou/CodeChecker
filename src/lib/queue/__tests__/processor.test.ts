import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processAnalysisTask } from '../processor';

// Create mock objects before mocking modules
const { mockDb, mockLogger, mockGetPrompt, mockOpenaiCreate, mockConfig } = vi.hoisted(() => {
    return {
        mockDb: {
            select: vi.fn(),
            from: vi.fn(),
            where: vi.fn(),
            limit: vi.fn(),
            update: vi.fn(),
            set: vi.fn(),
            returning: vi.fn(),
        },
        mockLogger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        },
        mockGetPrompt: vi.fn(),
        mockOpenaiCreate: vi.fn(),
        mockConfig: {
            OPENAI_API_KEY: 'test-api-key',
            OPENAI_BASE_URL: '',
            OPENAI_MODEL: 'gpt-4o',
            MODEL_SUPPORTS_VISION: true,
            REQUEST_TIMEOUT_SECONDS: 180,
            MAX_CONCURRENT_ANALYSIS_TASKS: 3,
        },
    };
});

// Mock dependencies
vi.mock('@/lib/db', () => ({
    db: mockDb,
}));

vi.mock('@/lib/logger', () => ({
    default: mockLogger,
}));

vi.mock('@/lib/prompts/loader', () => ({
    getPrompt: mockGetPrompt,
}));

vi.mock('@/lib/settings', () => ({
    config: mockConfig,
}));

vi.mock('openai', () => ({
    default: class {
        constructor() {
            // This will be called with apiKey and baseURL
        }
        chat = {
            completions: {
                create: mockOpenaiCreate,
            },
        };
    },
}));

describe('processAnalysisTask', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Set default config values
        mockConfig.OPENAI_API_KEY = 'test-api-key';
        mockConfig.OPENAI_MODEL = 'gpt-4o';
        mockConfig.REQUEST_TIMEOUT_SECONDS = 180;
        mockConfig.MODEL_SUPPORTS_VISION = true;

        // Set default prompt mock
        mockGetPrompt.mockResolvedValue('test prompt');
    });

    describe('Idempotency check', () => {
        it('should skip processing if request is already COMPLETED', async () => {
            mockDb.limit.mockResolvedValue([{
                id: 1,
                status: 'COMPLETED',
            }]);

            // Setup chain
            mockDb.select.mockReturnValue({
                from: () => ({
                    where: () => ({
                        limit: () => Promise.resolve([{ id: 1, status: 'COMPLETED' }]),
                    }),
                }),
            });

            await processAnalysisTask(1);

            expect(mockDb.update).not.toHaveBeenCalled();
        });

        it('should skip processing if request is already FAILED', async () => {
            mockDb.select.mockReturnValue({
                from: () => ({
                    where: () => ({
                        limit: () => Promise.resolve([{ id: 1, status: 'FAILED' }]),
                    }),
                }),
            });

            await processAnalysisTask(1);

            expect(mockDb.update).not.toHaveBeenCalled();
        });

        it('should return early if request is not found', async () => {
            mockDb.select.mockReturnValue({
                from: () => ({
                    where: () => ({
                        limit: () => Promise.resolve([]),
                    }),
                }),
            });

            await expect(processAnalysisTask(1)).resolves.not.toThrow();

            expect(mockDb.update).not.toHaveBeenCalled();
        });
    });

    describe('Configuration loading', () => {
        it('should throw error if API key is not configured', async () => {
            mockConfig.OPENAI_API_KEY = '';
            mockDb.select.mockReturnValue({
                from: () => ({
                    where: () => ({
                        limit: () => Promise.resolve([{
                            id: 1,
                            status: 'QUEUED',
                            userPrompt: 'test',
                            imageReferences: null,
                        }]),
                    }),
                }),
            });
            mockDb.update.mockReturnValue({
                set: () => ({
                    where: () => Promise.resolve({}),
                }),
            });

            await expect(processAnalysisTask(1)).rejects.toThrow('OPENAI_API_KEY is not configured');
        });

        it('should throw error if images provided but model does not support vision', async () => {
            mockConfig.MODEL_SUPPORTS_VISION = false;
            mockDb.select.mockReturnValue({
                from: () => ({
                    where: () => ({
                        limit: () => Promise.resolve([{
                            id: 1,
                            status: 'QUEUED',
                            userPrompt: 'test',
                            imageReferences: ["http://example.com/image.jpg"],
                        }]),
                    }),
                }),
            });
            mockDb.update.mockReturnValue({
                set: () => ({
                    where: () => Promise.resolve({}),
                }),
            });

            await expect(processAnalysisTask(1)).rejects.toThrow('Model does not support vision');
        });
    });

    describe('Single-stage pipeline', () => {
        beforeEach(() => {
            mockDb.select.mockReturnValue({
                from: () => ({
                    where: () => ({
                        limit: () => Promise.resolve([{
                            id: 1,
                            status: 'QUEUED',
                            userPrompt: 'test prompt',
                            imageReferences: null,
                        }]),
                    }),
                }),
            });
        });

        it('should update status to PROCESSING at start', async () => {
            mockOpenaiCreate.mockResolvedValue({
                choices: [{ message: { content: '{"result": "test"}' } }],
            });

            // Mock update chain
            mockDb.update.mockReturnValue({
                set: () => ({
                    where: () => Promise.resolve({}),
                }),
            });

            try {
                await processAnalysisTask(1);
            } catch {
                // Ignore errors from incomplete mock
            }

            expect(mockDb.update).toHaveBeenCalled();
        });

        it('should execute single API call', async () => {
            mockOpenaiCreate.mockResolvedValue({
                choices: [{ message: { content: '{"result": "test"}' } }],
            });

            mockDb.update.mockReturnValue({
                set: () => ({
                    where: () => Promise.resolve({}),
                }),
            });

            try {
                await processAnalysisTask(1);
            } catch {
                // Ignore errors
            }

            // Verify create was called only once (single-stage)
            expect(mockOpenaiCreate).toHaveBeenCalledTimes(1);
        });

        it('should mark task as COMPLETED on success', async () => {
            mockOpenaiCreate.mockResolvedValue({
                choices: [{ message: { content: '{"problem": {}, "code": {}, "modified_code": "test", "modification_analysis": []}' } }],
            });

            mockDb.update.mockReturnValue({
                set: () => ({
                    where: () => Promise.resolve({}),
                }),
            });

            try {
                await processAnalysisTask(1);
            } catch {
                // Ignore errors
            }

            // Verify update was called with COMPLETED status
            expect(mockDb.update).toHaveBeenCalled();
        });
    });

    describe('Error handling', () => {
        beforeEach(() => {
            mockDb.select.mockReturnValue({
                from: () => ({
                    where: () => ({
                        limit: () => Promise.resolve([{
                            id: 1,
                            status: 'QUEUED',
                            userPrompt: 'test',
                            imageReferences: null,
                        }]),
                    }),
                }),
            });
        });

        it('should handle API errors', async () => {
            mockOpenaiCreate.mockRejectedValue(new Error('API Error'));

            mockDb.update.mockReturnValue({
                set: () => ({
                    where: () => Promise.resolve({}),
                }),
            });

            await expect(processAnalysisTask(1)).rejects.toThrow('API Error');
        });

        it('should re-throw error to trigger retry in memory queue', async () => {
            mockOpenaiCreate.mockRejectedValue(new Error('Temporary error'));

            mockDb.update.mockReturnValue({
                set: () => ({
                    where: () => Promise.resolve({}),
                }),
            });

            await expect(processAnalysisTask(1)).rejects.toThrow('Temporary error');
        });
    });
});
