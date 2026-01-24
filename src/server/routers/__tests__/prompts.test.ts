import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { promptsRouter } from '../prompts';

// Mock getPromptFromFile with hoisted mock
const { mockGetPromptFromFile } = vi.hoisted(() => {
    return {
        mockGetPromptFromFile: vi.fn(),
    };
});

vi.mock('@/lib/prompts/loader', () => ({
    getPromptFromFile: mockGetPromptFromFile,
}));

describe('promptsRouter', () => {
    // Create caller with admin token
    const SETTINGS_TOKEN = 'test-admin-token';
    const originalEnv = process.env.SETTINGS_TOKEN;

    beforeAll(() => {
        process.env.SETTINGS_TOKEN = SETTINGS_TOKEN;
    });

    afterAll(() => {
        process.env.SETTINGS_TOKEN = originalEnv;
    });

    const headers = new Headers();
    headers.set('x-admin-token', SETTINGS_TOKEN);

    const createCaller = () => promptsRouter.createCaller({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Intentionally partial mock for testing
        prisma: {} as any,
        headers,
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getDefault', () => {
        it('should return default prompt content from file', async () => {
            mockGetPromptFromFile.mockResolvedValue('Default prompt content');

            const caller = createCaller();
            const result = await caller.getDefault({ name: 'step1-problem' });

            expect(mockGetPromptFromFile).toHaveBeenCalledWith('step1-problem');
            expect(result).toBe('Default prompt content');
        });

        it('should handle different prompt names', async () => {
            const testCases = [
                { name: 'step1-problem', content: 'Step 1 prompt' },
                { name: 'step2-code', content: 'Step 2 prompt' },
                { name: 'step3-analysis', content: 'Step 3 prompt' },
            ];

            for (const testCase of testCases) {
                mockGetPromptFromFile.mockResolvedValue(testCase.content);

                const caller = createCaller();
                const result = await caller.getDefault({ name: testCase.name });

                expect(mockGetPromptFromFile).toHaveBeenCalledWith(testCase.name);
                expect(result).toBe(testCase.content);
            }
        });

        it('should propagate errors from file loader', async () => {
            mockGetPromptFromFile.mockRejectedValue(new Error('File not found'));

            const caller = createCaller();
            await expect(caller.getDefault({ name: 'unknown-prompt' })).rejects.toThrow('File not found');
        });
    });
});
