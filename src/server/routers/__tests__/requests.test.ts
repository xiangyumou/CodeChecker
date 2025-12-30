import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestsRouter } from '../requests';
import { TRPCError } from '@trpc/server';

const { mockQStash } = vi.hoisted(() => {
    return {
        mockQStash: {
            publishJSON: vi.fn(),
        }
    };
});

// Mock dependencies
const mockPrisma = {
    request: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
};

vi.mock('@/lib/qstash/client', () => ({
    qstash: mockQStash,
    getWebhookUrl: (path: string) => `http://localhost:3000${path}`,
}));

describe('requestsRouter', () => {
    // Create caller with mocked context
    const caller = requestsRouter.createCaller({
        prisma: mockPrisma as any,
        headers: new Headers(),
    });

    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('list', () => {
        it('should return a list of requests', async () => {
            const mockData = [{ id: 1, status: 'COMPLETED' }];
            mockPrisma.request.findMany.mockResolvedValue(mockData);

            const result = await caller.list({});

            expect(mockPrisma.request.findMany).toHaveBeenCalledWith(expect.objectContaining({
                take: 20,
                skip: 0,
                orderBy: { createdAt: 'desc' },
            }));
            expect(result).toEqual(mockData);
        });

        it('should filter by status', async () => {
            mockPrisma.request.findMany.mockResolvedValue([]);
            await caller.list({ status: 'FAILED' });
            expect(mockPrisma.request.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { status: 'FAILED' },
            }));
        });
    });

    describe('getById', () => {
        it('should return request by id', async () => {
            const mockRequest = {
                id: 1,
                imageReferences: '["img1"]',
                gptRawResponse: '{"foo":"bar"}'
            };
            mockPrisma.request.findUnique.mockResolvedValue(mockRequest);

            const result = await caller.getById(1);

            expect(mockPrisma.request.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
            expect(result).toMatchObject({
                id: 1,
                imageReferences: ['img1'],
                gptRawResponse: { foo: 'bar' },
            });
        });

        it('should throw NOT_FOUND calls', async () => {
            mockPrisma.request.findUnique.mockResolvedValue(null);
            await expect(caller.getById(999)).rejects.toThrow(TRPCError);
        });
    });

    describe('create', () => {
        it('should create request and publish to QStash', async () => {
            const input = { userPrompt: 'Test Prompt', imageReferences: ['ref'] };
            const mockCreated = { id: 123, ...input, status: 'QUEUED' };

            mockPrisma.request.create.mockResolvedValue(mockCreated);
            mockQStash.publishJSON.mockResolvedValue({ messageId: 'msg-123' });

            const result = await caller.create(input);

            expect(mockPrisma.request.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userPrompt: 'Test Prompt',
                    imageReferences: JSON.stringify(['ref']),
                    status: 'QUEUED',
                }),
            });

            expect(mockQStash.publishJSON).toHaveBeenCalledWith({
                url: 'http://localhost:3000/api/analyze-request',
                body: { requestId: 123 },
            });
            expect(result).toEqual(mockCreated);
        });
    });

    describe('delete', () => {
        it('should delete request', async () => {
            mockPrisma.request.findUnique.mockResolvedValue({ id: 1 });
            mockPrisma.request.delete.mockResolvedValue({ id: 1 });

            const result = await caller.delete(1);

            expect(mockPrisma.request.delete).toHaveBeenCalledWith({ where: { id: 1 } });
            expect(result).toEqual({ success: true, id: 1 });
        });
    });

    describe('retry', () => {
        it('should reset request fields and publish to QStash', async () => {
            const mockRequest = { id: 1, status: 'FAILED' };
            const mockUpdated = {
                id: 1,
                status: 'QUEUED',
                isSuccess: false,
                stage1Status: 'pending'
            };

            mockPrisma.request.findUnique.mockResolvedValue(mockRequest);
            mockPrisma.request.update.mockResolvedValue(mockUpdated);
            mockQStash.publishJSON.mockResolvedValue({ messageId: 'msg-456' });

            const result = await caller.retry(1);

            expect(mockPrisma.request.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({
                    status: 'QUEUED',
                    isSuccess: false,
                    stage1Status: 'pending',
                }),
            });
            expect(mockQStash.publishJSON).toHaveBeenCalledWith({
                url: 'http://localhost:3000/api/analyze-request',
                body: { requestId: 1 },
            });
            expect(result).toEqual(mockUpdated);
        });

        it('should throw NOT_FOUND if request does not exist', async () => {
            mockPrisma.request.findUnique.mockResolvedValue(null);
            await expect(caller.retry(999)).rejects.toThrow(TRPCError);
        });
    });
});
