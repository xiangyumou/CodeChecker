import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processAnalysisTask } from '../processor';

// Create mock objects before mocking modules
const { mockPrisma, mockLogger, mockGetPrompt, mockOpenaiCreate } = vi.hoisted(() => {
    return {
        mockPrisma: {
            request: {
                findUnique: vi.fn(),
                update: vi.fn(),
            },
            setting: {
                findMany: vi.fn(),
            },
        },
        mockLogger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        },
        mockGetPrompt: vi.fn(),
        mockOpenaiCreate: vi.fn(),
    };
});

// Mock dependencies
vi.mock('@/lib/db', () => ({
    prisma: mockPrisma,
}));

vi.mock('@/lib/logger', () => ({
    default: mockLogger,
}));

vi.mock('@/lib/prompts/loader', () => ({
    getPrompt: mockGetPrompt,
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

        // Set default environment variables
        process.env.OPENAI_API_KEY = 'test-api-key';
        process.env.OPENAI_MODEL = 'gpt-4o';
        process.env.REQUEST_TIMEOUT_SECONDS = '180';
        process.env.MODEL_SUPPORTS_VISION = 'true';

        // Set default prompt mock
        mockGetPrompt.mockResolvedValue('test prompt');
    });

    describe('Idempotency check', () => {
        it('should skip processing if request is already COMPLETED', async () => {
            mockPrisma.request.findUnique.mockResolvedValue({
                id: 1,
                status: 'COMPLETED',
            });

            await processAnalysisTask(1);

            expect(mockPrisma.request.update).not.toHaveBeenCalled();
        });

        it('should skip processing if request is already FAILED', async () => {
            mockPrisma.request.findUnique.mockResolvedValue({
                id: 1,
                status: 'FAILED',
            });

            await processAnalysisTask(1);

            expect(mockPrisma.request.update).not.toHaveBeenCalled();
        });

        it('should return early if request is not found', async () => {
            mockPrisma.request.findUnique.mockResolvedValue(null);

            await expect(processAnalysisTask(1)).resolves.not.toThrow();

            expect(mockPrisma.request.update).not.toHaveBeenCalled();
        });
    });

    describe('Configuration loading', () => {
        it('should throw error if API key is not configured', async () => {
            delete process.env.OPENAI_API_KEY;
            mockPrisma.request.findUnique.mockResolvedValue({
                id: 1,
                status: 'QUEUED',
                userPrompt: 'test',
                imageReferences: null,
            });
            mockPrisma.setting.findMany.mockResolvedValue([]);
            mockPrisma.request.update.mockResolvedValue({});

            await expect(processAnalysisTask(1)).rejects.toThrow('OPENAI_API_KEY is not configured');
        });

        it('should throw error if images provided but model does not support vision', async () => {
            process.env.MODEL_SUPPORTS_VISION = 'false';
            mockPrisma.request.findUnique.mockResolvedValue({
                id: 1,
                status: 'QUEUED',
                userPrompt: 'test',
                imageReferences: ["http://example.com/image.jpg"],
            });
            mockPrisma.setting.findMany.mockResolvedValue([]);
            mockPrisma.request.update.mockResolvedValue({});

            await expect(processAnalysisTask(1)).rejects.toThrow('Model does not support vision');
        });
    });

    describe('Three-stage pipeline', () => {
        beforeEach(() => {
            mockPrisma.request.findUnique.mockResolvedValue({
                id: 1,
                status: 'QUEUED',
                userPrompt: 'test prompt',
                imageReferences: null,
            });
            mockPrisma.setting.findMany.mockResolvedValue([]);
        });

        it('should update status to PROCESSING at start', async () => {
            mockOpenaiCreate.mockResolvedValue({
                choices: [{ message: { content: '{"result": "test"}' } }],
            });
            mockPrisma.request.update.mockResolvedValue({});

            try {
                await processAnalysisTask(1);
            } catch (e) {
                // Ignore errors from incomplete mock
            }

            expect(mockPrisma.request.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { status: 'PROCESSING' },
            });
        });

        it('should execute step 1 and step 2 in parallel', async () => {
            mockOpenaiCreate.mockResolvedValue({
                choices: [{ message: { content: '{"result": "test"}' } }],
            });
            mockPrisma.request.update.mockResolvedValue({});

            try {
                await processAnalysisTask(1);
            } catch (e) {
                // Ignore errors
            }

            // Verify stage1 and stage2 were set to processing
            expect(mockPrisma.request.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    stage1Status: 'processing',
                    stage2Status: 'processing',
                },
            });

            // Verify create was called (step 1, 2, and 3)
            expect(mockOpenaiCreate).toHaveBeenCalledTimes(3);
        });

        it('should update stage 1 and 2 status to completed', async () => {
            mockOpenaiCreate
                .mockResolvedValueOnce({
                    choices: [{ message: { content: '{"problem": "test problem"}' } }],
                })
                .mockResolvedValueOnce({
                    choices: [{ message: { content: '{"code": "formatted code"}' } }],
                })
                .mockResolvedValueOnce({
                    choices: [{ message: { content: '{"modification_analysis": "analysis", "modified_code": "code"}' } }],
                });
            mockPrisma.request.update.mockResolvedValue({});

            try {
                await processAnalysisTask(1);
            } catch (e) {
                // Ignore errors
            }

            // Find the update call that sets stages to completed
            const updateCalls = mockPrisma.request.update.mock.calls;
            const completedCall = updateCalls.find((call) =>
                call[0]?.data?.stage1Status === 'completed' && call[0]?.data?.stage2Status === 'completed'
            );

            expect(completedCall).toBeDefined();
            expect(completedCall?.[0]?.data?.problemDetails).toEqual({problem:"test problem"});
            expect(completedCall?.[0]?.data?.formattedCode).toBe('formatted code');
        });

        it('should execute step 3 after step 1 and 2 complete', async () => {
            mockOpenaiCreate.mockResolvedValue({
                choices: [{ message: { content: '{"result": "test"}' } }],
            });
            mockPrisma.request.update.mockResolvedValue({});

            try {
                await processAnalysisTask(1);
            } catch (e) {
                // Ignore errors
            }

            // Verify stage3 was set to processing
            expect(mockPrisma.request.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { stage3Status: 'processing' },
            });

            // Verify 3 API calls were made (step 1, 2, and 3)
            expect(mockOpenaiCreate).toHaveBeenCalledTimes(3);
        });

        it('should mark task as COMPLETED on success', async () => {
            mockOpenaiCreate
                .mockResolvedValueOnce({
                    choices: [{ message: { content: '{"problem": "test"}' } }],
                })
                .mockResolvedValueOnce({
                    choices: [{ message: { content: '{"code": "code"}' } }],
                })
                .mockResolvedValueOnce({
                    choices: [{ message: { content: '{"modification_analysis": "analysis", "modified_code": "new code"}' } }],
                });
            mockPrisma.request.update.mockResolvedValue({});

            try {
                await processAnalysisTask(1);
            } catch (e) {
                // Ignore errors
            }

            // Find the final update call
            const updateCalls = mockPrisma.request.update.mock.calls;
            const completedCall = updateCalls.find((call) => call[0]?.data?.status === 'COMPLETED');

            expect(completedCall).toBeDefined();
            expect(completedCall?.[0]?.data?.isSuccess).toBe(true);
            expect(completedCall?.[0]?.data?.errorMessage).toBe(null);
            expect(completedCall?.[0]?.data?.stage3Status).toBe('completed');
        });
    });

    describe('Error handling', () => {
        beforeEach(() => {
            mockPrisma.request.findUnique.mockResolvedValue({
                id: 1,
                status: 'QUEUED',
                userPrompt: 'test',
                imageReferences: null,
            });
            mockPrisma.setting.findMany.mockResolvedValue([]);
        });

        it('should handle empty response from step 3', async () => {
            mockOpenaiCreate
                .mockResolvedValueOnce({
                    choices: [{ message: { content: '{"problem": "test"}' } }],
                })
                .mockResolvedValueOnce({
                    choices: [{ message: { content: '{"code": "code"}' } }],
                })
                .mockResolvedValueOnce({
                    choices: [{ message: { content: null } }],
                });
            mockPrisma.request.update.mockResolvedValue({});

            await expect(processAnalysisTask(1)).rejects.toThrow('Empty response from Step 3');

            // Verify error status was set
            const updateCalls = mockPrisma.request.update.mock.calls;
            const failedCall = updateCalls.find((call) => call[0]?.data?.status === 'FAILED');
            expect(failedCall).toBeDefined();
            expect(failedCall?.[0]?.data?.isSuccess).toBe(false);
        });

        it('should handle API errors', async () => {
            mockOpenaiCreate.mockRejectedValue(new Error('API Error'));
            mockPrisma.request.update.mockResolvedValue({});

            await expect(processAnalysisTask(1)).rejects.toThrow('API Error');

            // Verify error status was set
            const updateCalls = mockPrisma.request.update.mock.calls;
            const failedCall = updateCalls.find((call) => call[0]?.data?.status === 'FAILED');
            expect(failedCall).toBeDefined();
            expect(failedCall?.[0]?.data?.isSuccess).toBe(false);
        });

        it('should re-throw error to trigger BullMQ retry', async () => {
            mockOpenaiCreate.mockRejectedValue(new Error('Temporary error'));
            mockPrisma.request.update.mockResolvedValue({});

            await expect(processAnalysisTask(1)).rejects.toThrow('Temporary error');
        });
    });

    describe('Content preparation', () => {
        beforeEach(() => {
            mockPrisma.setting.findMany.mockResolvedValue([]);
            mockOpenaiCreate.mockResolvedValue({
                choices: [{ message: { content: '{"result": "test"}' } }],
            });
            mockPrisma.request.update.mockResolvedValue({});
        });

        it('should handle user prompt', async () => {
            mockPrisma.request.findUnique.mockResolvedValue({
                id: 1,
                status: 'QUEUED',
                userPrompt: 'my code problem',
                imageReferences: null,
            });

            try {
                await processAnalysisTask(1);
            } catch (e) {
                // Ignore errors
            }

            const calls = mockOpenaiCreate.mock.calls;
            expect(calls.length).toBeGreaterThan(0);
            const userContent = calls[0][0].messages[1].content;
            expect(userContent).toEqual([
                { type: 'text', text: 'my code problem' },
            ]);
        });

        it('should handle image references', async () => {
            mockPrisma.request.findUnique.mockResolvedValue({
                id: 1,
                status: 'QUEUED',
                userPrompt: null,
                imageReferences: ["http://example.com/img1.jpg", "http://example.com/img2.jpg"],
            });

            try {
                await processAnalysisTask(1);
            } catch (e) {
                // Ignore errors
            }

            const calls = mockOpenaiCreate.mock.calls;
            const userContent = calls[0][0].messages[1].content;
            expect(userContent).toEqual([
                { type: 'image_url', image_url: { url: 'http://example.com/img1.jpg' } },
                { type: 'image_url', image_url: { url: 'http://example.com/img2.jpg' } },
            ]);
        });

        it('should use default text when no content provided', async () => {
            mockPrisma.request.findUnique.mockResolvedValue({
                id: 1,
                status: 'QUEUED',
                userPrompt: null,
                imageReferences: null,
            });

            try {
                await processAnalysisTask(1);
            } catch (e) {
                // Ignore errors
            }

            const calls = mockOpenaiCreate.mock.calls;
            const userContent = calls[0][0].messages[1].content;
            expect(userContent).toEqual([
                { type: 'text', text: 'No problem description provided.' },
            ]);
        });

        it('should handle both user prompt and images', async () => {
            mockPrisma.request.findUnique.mockResolvedValue({
                id: 1,
                status: 'QUEUED',
                userPrompt: 'Help me fix this code',
                imageReferences: ["http://example.com/img.jpg"],
            });

            try {
                await processAnalysisTask(1);
            } catch (e) {
                // Ignore errors
            }

            const calls = mockOpenaiCreate.mock.calls;
            const userContent = calls[0][0].messages[1].content;
            expect(userContent).toEqual([
                { type: 'text', text: 'Help me fix this code' },
                { type: 'image_url', image_url: { url: 'http://example.com/img.jpg' } },
            ]);
        });
    });

    describe('Step 3 input format', () => {
        beforeEach(() => {
            mockPrisma.request.findUnique.mockResolvedValue({
                id: 1,
                status: 'QUEUED',
                userPrompt: 'test',
                imageReferences: null,
            });
            mockPrisma.setting.findMany.mockResolvedValue([]);
            mockPrisma.request.update.mockResolvedValue({});
        });

        it('should format step 3 input correctly', async () => {
            mockOpenaiCreate
                .mockResolvedValueOnce({
                    choices: [{ message: { content: '{"problem": "test problem"}' } }],
                })
                .mockResolvedValueOnce({
                    choices: [{ message: { content: '{"code": "formatted code"}' } }],
                })
                .mockResolvedValue({
                    choices: [{ message: { content: '{"analysis": "test"}' } }],
                });

            try {
                await processAnalysisTask(1);
            } catch (e) {
                // Ignore errors
            }

            // The third call should be step 3 with formatted input
            const thirdCall = mockOpenaiCreate.mock.calls[2];
            const step3Input = thirdCall[0].messages[1].content;

            // Should be JSON string with problem and user_code
            expect(typeof step3Input).toBe('string');
            const parsed = JSON.parse(step3Input);
            expect(parsed).toHaveProperty('problem');
            expect(parsed).toHaveProperty('user_code');
        });
    });
});
