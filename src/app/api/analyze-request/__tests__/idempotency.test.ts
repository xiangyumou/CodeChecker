import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Use vi.hoisted to ensure mocks are created before imports
const { mockPrisma, mockLogger, mockOpenAI, mockReceiverInstance } = vi.hoisted(() => {
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
        mockOpenAI: {
            chat: {
                completions: {
                    create: vi.fn(),
                },
            },
        },
        mockReceiverInstance: {
            verify: vi.fn(),
        },
    };
});

vi.mock('@/lib/db', () => ({
    prisma: mockPrisma,
}));

vi.mock('@/lib/logger', () => ({
    default: mockLogger,
}));

vi.mock('openai', () => ({
    default: vi.fn(() => mockOpenAI),
}));

vi.mock('@upstash/qstash', () => ({
    Receiver: class MockReceiver {
        verify = mockReceiverInstance.verify;
    },
}));

vi.mock('@/lib/prompts/loader', () => ({
    getPrompt: vi.fn(() => Promise.resolve('mock prompt')),
}));

describe('analyze-request webhook', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        process.env.QSTASH_CURRENT_SIGNING_KEY = 'test-key';
        process.env.QSTASH_NEXT_SIGNING_KEY = 'test-key-next';
        process.env.OPENAI_API_KEY = 'test-api-key';
    });

    describe('idempotency checks', () => {
        it('should return 200 for COMPLETED tasks without reprocessing', async () => {
            const requestId = 123;
            mockPrisma.request.findUnique.mockResolvedValue({
                id: requestId,
                status: 'COMPLETED',
                isSuccess: true,
            });

            // Import the handler dynamically
            const { POST } = await import('../route');

            const body = JSON.stringify({ requestId });
            const request = new NextRequest('http://localhost:3000/api/analyze-request', {
                method: 'POST',
                headers: {
                    'upstash-signature': 'mock-signature',
                },
                body,
            });

            mockReceiverInstance.verify.mockResolvedValue(true);

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toContain('COMPLETED');
            expect(mockPrisma.request.update).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(
                { requestId, status: 'COMPLETED' },
                'Task already processed, returning 200 to acknowledge'
            );
        });

        it('should return 200 for FAILED tasks without reprocessing', async () => {
            const requestId = 456;
            mockPrisma.request.findUnique.mockResolvedValue({
                id: requestId,
                status: 'FAILED',
                isSuccess: false,
                errorMessage: 'Service restarted while task was processing',
            });

            const { POST } = await import('../route');

            const body = JSON.stringify({ requestId });
            const request = new NextRequest('http://localhost:3000/api/analyze-request', {
                method: 'POST',
                headers: {
                    'upstash-signature': 'mock-signature',
                },
                body,
            });

            mockReceiverInstance.verify.mockResolvedValue(true);

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toContain('FAILED');
            expect(mockPrisma.request.update).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(
                { requestId, status: 'FAILED' },
                'Task already processed, returning 200 to acknowledge'
            );
        });

        it('should return 200 for deleted requests', async () => {
            const requestId = 789;
            mockPrisma.request.findUnique.mockResolvedValue(null);

            const { POST } = await import('../route');

            const body = JSON.stringify({ requestId });
            const request = new NextRequest('http://localhost:3000/api/analyze-request', {
                method: 'POST',
                headers: {
                    'upstash-signature': 'mock-signature',
                },
                body,
            });

            mockReceiverInstance.verify.mockResolvedValue(true);

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toContain('deleted');
            expect(mockLogger.warn).toHaveBeenCalledWith(
                { requestId },
                'Request not found (likely deleted), returning 200 to stop retry'
            );
        });
    });
});
