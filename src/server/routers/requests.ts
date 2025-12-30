import { subHours, subDays, subMonths } from 'date-fns';
import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { qstash, getWebhookUrl, getConcurrencyLimit } from '@/lib/qstash/client';

// Zod schemas for validation
const createRequestSchema = z.object({
    userPrompt: z.string().optional(),
    imageReferences: z.array(z.string()).optional(),
}).refine(
    (data) => data.userPrompt || (data.imageReferences && data.imageReferences.length > 0),
    {
        message: 'Either userPrompt or imageReferences must be provided',
        path: ['userPrompt'],
    }
);

const requestIdSchema = z.number().int().positive();

export const requestsRouter = router({
    // Get all requests with optional filtering
    list: adminProcedure
        .input(
            z
                .object({
                    status: z.enum(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
                    cursor: z.number().int().min(1).optional(),
                    take: z.number().int().min(1).max(100).default(20),
                })
        )
        .query(async ({ ctx, input }) => {
            const { status, cursor, take = 20 } = input;

            return ctx.prisma.request.findMany({
                where: status ? { status } : undefined,
                take,
                skip: cursor ? 1 : 0,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    status: true,
                    userPrompt: true,
                    isSuccess: true,
                    createdAt: true,
                    updatedAt: true,
                    errorMessage: true,
                },
            });
        }),

    // Get request by ID
    getById: adminProcedure
        .input(requestIdSchema)
        .query(async ({ ctx, input }) => {
            const request = await ctx.prisma.request.findUnique({
                where: { id: input },
            });

            if (!request) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: `Request with ID ${input} not found`,
                });
            }

            // Parse JSON fields
            return {
                ...request,
                imageReferences: request.imageReferences
                    ? JSON.parse(request.imageReferences)
                    : null,
                gptRawResponse: request.gptRawResponse
                    ? JSON.parse(request.gptRawResponse)
                    : null,
                // Stage tracking fields are already included from the database query
            };
        }),

    // Create new request
    create: publicProcedure
        .input(createRequestSchema)
        .mutation(async ({ ctx, input }) => {
            const request = await ctx.prisma.request.create({
                data: {
                    userPrompt: input.userPrompt,
                    imageReferences: input.imageReferences
                        ? JSON.stringify(input.imageReferences)
                        : null,
                    status: 'QUEUED',
                    isSuccess: false,
                },
            });

            // Send task to QStash with Flow-Control
            const concurrency = await getConcurrencyLimit();
            await qstash.publishJSON({
                url: getWebhookUrl('/api/analyze-request'),
                body: { requestId: request.id },
                flowControl: {
                    key: 'code-analysis',
                    parallelism: concurrency,
                },
            });

            return request;
        }),

    // Delete request
    delete: adminProcedure
        .input(requestIdSchema)
        .mutation(async ({ ctx, input }) => {
            const request = await ctx.prisma.request.findUnique({
                where: { id: input },
            });

            if (!request) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: `Request with ID ${input} not found`,
                });
            }

            await ctx.prisma.request.delete({
                where: { id: input },
            });

            return { success: true, id: input };
        }),

    // Regenerate request (creates a new request)
    regenerate: adminProcedure
        .input(requestIdSchema)
        .mutation(async ({ ctx, input }) => {
            const originalRequest = await ctx.prisma.request.findUnique({
                where: { id: input },
            });

            if (!originalRequest) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: `Request with ID ${input} not found`,
                });
            }

            // Create new request with same prompt
            const newRequest = await ctx.prisma.request.create({
                data: {
                    userPrompt: originalRequest.userPrompt,
                    imageReferences: originalRequest.imageReferences,
                    status: 'QUEUED',
                    isSuccess: false,
                },
            });

            // Send task to QStash with Flow-Control
            const concurrency = await getConcurrencyLimit();
            await qstash.publishJSON({
                url: getWebhookUrl('/api/analyze-request'),
                body: { requestId: newRequest.id },
                flowControl: {
                    key: 'code-analysis',
                    parallelism: concurrency,
                },
            });

            return newRequest;
        }),

    // Retry request (resets existing request)
    retry: adminProcedure
        .input(requestIdSchema)
        .mutation(async ({ ctx, input }) => {
            const request = await ctx.prisma.request.findUnique({
                where: { id: input },
            });

            if (!request) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: `Request with ID ${input} not found`,
                });
            }

            // Reset fields
            const updatedRequest = await ctx.prisma.request.update({
                where: { id: input },
                data: {
                    status: 'QUEUED',
                    isSuccess: false,
                    errorMessage: null,
                    gptRawResponse: null,
                    formattedCode: null,
                    problemDetails: null,
                    analysisResult: null,
                    stage1Status: 'pending',
                    stage2Status: 'pending',
                    stage3Status: 'pending',
                    stage1CompletedAt: null,
                    stage2CompletedAt: null,
                    stage3CompletedAt: null,
                },
            });

            // Send task to QStash with Flow-Control
            const concurrency = await getConcurrencyLimit();
            await qstash.publishJSON({
                url: getWebhookUrl('/api/analyze-request'),
                body: { requestId: updatedRequest.id },
                flowControl: {
                    key: 'code-analysis',
                    parallelism: concurrency,
                },
            });

            return updatedRequest;
        }),

    // Prune old requests
    prune: adminProcedure
        .input(
            z.object({
                amount: z.number().int().min(1),
                unit: z.enum(['hours', 'days', 'months']),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { amount, unit } = input;
            const now = new Date();
            let olderThan: Date;

            switch (unit) {
                case 'hours':
                    olderThan = subHours(now, amount);
                    break;
                case 'days':
                    olderThan = subDays(now, amount);
                    break;
                case 'months':
                    olderThan = subMonths(now, amount);
                    break;
            }

            const result = await ctx.prisma.request.deleteMany({
                where: {
                    createdAt: {
                        lt: olderThan,
                    },
                },
            });

            return { success: true, count: result.count };
        }),
});
