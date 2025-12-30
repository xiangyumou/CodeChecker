import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processAnalysisRequest, requestUpdateEmitter } from '../openai-processor';
import { prisma } from '@/lib/db';
import fs from 'fs/promises';
import OpenAI from 'openai';
import logger from '@/lib/logger';

// Hoist the mock function
const { mockCreate } = vi.hoisted(() => {
    return { mockCreate: vi.fn() };
});

// Mock dependencies
const { mockRequestUpdate, mockRequestFindUnique, mockSettingFindMany } = vi.hoisted(() => {
    return {
        mockRequestUpdate: vi.fn(),
        mockRequestFindUnique: vi.fn(),
        mockSettingFindMany: vi.fn().mockResolvedValue([]),
    };
});

vi.mock('@/lib/db', () => ({
    prisma: {
        request: {
            findUnique: mockRequestFindUnique,
            update: mockRequestUpdate,
        },
        setting: {
            findMany: mockSettingFindMany,
        },
    },
}));

vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(),
    },
}));

// Mock OpenAI
vi.mock('openai', () => {
    return {
        default: class OpenAI {
            chat: any;
            constructor() {
                this.chat = {
                    completions: {
                        create: mockCreate,
                    },
                };
            }
        },
    };
});

describe('processAnalysisRequest', () => {
    const requestId = 1;
    const mockSystemPrompt = 'Mock System Prompt';
    const mockRequest = {
        id: requestId,
        userPrompt: 'Test Prompt',
        imageReferences: null,
    };

    beforeEach(() => {
        vi.resetAllMocks();
        mockSettingFindMany.mockResolvedValue([]);
        (fs.readFile as any).mockResolvedValue(mockSystemPrompt);
        process.env.OPENAI_API_KEY = 'test-key';
    });

    afterEach(() => {
        delete process.env.OPENAI_API_KEY;
    });

    it('should process request successfully with 3-stage pipeline', async () => {
        (prisma.request.findUnique as any).mockResolvedValue(mockRequest);

        // Mock 3 sequential calls to OpenAI:
        // 1. Problem extraction
        // 2. Code formatting
        // 3. Analysis
        mockCreate
            .mockResolvedValueOnce({
                choices: [{ message: { content: JSON.stringify({ title: 'Two Sum' }) } }]
            })
            .mockResolvedValueOnce({
                choices: [{ message: { content: JSON.stringify({ code: 'formatted code' }) } }]
            })
            .mockResolvedValueOnce({
                choices: [{ message: { content: JSON.stringify({ modified_code: 'fixed', modification_analysis: [] }) } }]
            });

        await processAnalysisRequest(requestId);

        // Verify loaded prompts
        expect(fs.readFile).toHaveBeenCalledTimes(3);

        // Verify initial PROCESSING status update
        expect(prisma.request.update).toHaveBeenCalledWith({
            where: { id: requestId },
            data: { status: 'PROCESSING' },
        });

        // Verify stage 1 updates
        expect(prisma.request.update).toHaveBeenCalledWith({
            where: { id: requestId },
            data: { stage1Status: 'processing' },
        });

        expect(prisma.request.update).toHaveBeenCalledWith({
            where: { id: requestId },
            data: expect.objectContaining({
                problemDetails: JSON.stringify({ title: 'Two Sum' }),
                stage1Status: 'completed',
                stage1CompletedAt: expect.any(Date),
            }),
        });

        // Verify stage 2 updates
        expect(prisma.request.update).toHaveBeenCalledWith({
            where: { id: requestId },
            data: { stage2Status: 'processing' },
        });

        expect(prisma.request.update).toHaveBeenCalledWith({
            where: { id: requestId },
            data: expect.objectContaining({
                formattedCode: 'formatted code',
                stage2Status: 'completed',
                stage2CompletedAt: expect.any(Date),
            }),
        });

        // Verify stage 3 updates
        expect(prisma.request.update).toHaveBeenCalledWith({
            where: { id: requestId },
            data: { stage3Status: 'processing' },
        });

        // Verify final completion with all stage tracking
        expect(prisma.request.update).toHaveBeenLastCalledWith({
            where: { id: requestId },
            data: expect.objectContaining({
                status: 'COMPLETED',
                analysisResult: JSON.stringify({ modified_code: 'fixed', modification_analysis: [] }),
                stage3Status: 'completed',
                stage3CompletedAt: expect.any(Date),
                isSuccess: true,
                errorMessage: null,
            }),
        });
    });

    it('should handle request not found', async () => {
        (prisma.request.findUnique as any).mockResolvedValue(null);
        const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => { });

        await processAnalysisRequest(requestId);

        expect(loggerSpy).toHaveBeenCalledWith({ requestId }, 'Request not found');
        expect(prisma.request.update).not.toHaveBeenCalled();
        loggerSpy.mockRestore();
    });

    it('should handle API error in first stage', async () => {
        (prisma.request.findUnique as any).mockResolvedValue(mockRequest);
        mockCreate.mockRejectedValue(new Error('Stage 1 Error'));

        await processAnalysisRequest(requestId);

        expect(prisma.request.update).toHaveBeenCalledWith({
            where: { id: requestId },
            data: {
                status: 'FAILED',
                errorMessage: 'Stage 1 Error',
                isSuccess: false,
            },
        });
    });
});
