import { subMinutes, subHours, subDays, subMonths } from 'date-fns';
import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { addAnalysisTask } from '@/lib/queue/memory-queue';
import logger from '@/lib/logger';
import { requests } from '@/lib/db/schema';
import { eq, lt, desc } from 'drizzle-orm';

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
    list: publicProcedure
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

            const results = await ctx.db.select({
                id: requests.id,
                status: requests.status,
                userPrompt: requests.userPrompt,
                isSuccess: requests.isSuccess,
                createdAt: requests.createdAt,
                updatedAt: requests.updatedAt,
                errorMessage: requests.errorMessage,
            }).from(requests)
                .where(status ? eq(requests.status, status) : undefined)
                .limit(take)
                .offset(cursor ? 1 : 0)
                .orderBy(desc(requests.createdAt));

            return results;
        }),

    // Get request by ID
    getById: publicProcedure
        .input(requestIdSchema)
        .query(async ({ ctx, input }) => {
            const request = await ctx.db.select().from(requests)
                .where(eq(requests.id, input))
                .limit(1)
                .then(rows => rows[0]);

            if (!request) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: `Request with ID ${input} not found`,
                });
            }

            return request;
        }),

    // Create new request
    create: publicProcedure
        .input(createRequestSchema)
        .mutation(async ({ ctx, input }) => {
            const result = await ctx.db.insert(requests).values({
                userPrompt: input.userPrompt,
                imageReferences: input.imageReferences ?? undefined,
                status: 'QUEUED',
                isSuccess: false,
            }).returning();

            const request = result[0];

            // Add task to memory queue (non-blocking)
            addAnalysisTask(request.id).catch((err) => {
                logger.error({ err, requestId: request.id }, 'Task failed after all retries');
            });

            return request;
        }),

    // Delete request
    delete: adminProcedure
        .input(requestIdSchema)
        .mutation(async ({ ctx, input }) => {
            const request = await ctx.db.select().from(requests)
                .where(eq(requests.id, input))
                .limit(1)
                .then(rows => rows[0]);

            if (!request) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: `Request with ID ${input} not found`,
                });
            }

            await ctx.db.delete(requests).where(eq(requests.id, input));

            return { success: true, id: input };
        }),

    // Regenerate request (creates a new request)
    regenerate: adminProcedure
        .input(requestIdSchema)
        .mutation(async ({ ctx, input }) => {
            const originalRequest = await ctx.db.select().from(requests)
                .where(eq(requests.id, input))
                .limit(1)
                .then(rows => rows[0]);

            if (!originalRequest) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: `Request with ID ${input} not found`,
                });
            }

            // Create new request with same prompt
            const result = await ctx.db.insert(requests).values({
                userPrompt: originalRequest.userPrompt,
                imageReferences: originalRequest.imageReferences as string[] | undefined,
                status: 'QUEUED',
                isSuccess: false,
            }).returning();

            const newRequest = result[0];

            // Add task to memory queue (non-blocking)
            addAnalysisTask(newRequest.id).catch((err) => {
                logger.error({ err, requestId: newRequest.id }, 'Task failed after all retries');
            });

            return newRequest;
        }),

    // Retry request (resets existing request)
    retry: publicProcedure
        .input(requestIdSchema)
        .mutation(async ({ ctx, input }) => {
            const request = await ctx.db.select().from(requests)
                .where(eq(requests.id, input))
                .limit(1)
                .then(rows => rows[0]);

            if (!request) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: `Request with ID ${input} not found`,
                });
            }

            // Reset fields
            const result = await ctx.db.update(requests).set({
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
            }).where(eq(requests.id, input)).returning();

            const updatedRequest = result[0];

            // Add task to memory queue (non-blocking)
            addAnalysisTask(updatedRequest.id).catch((err) => {
                logger.error({ err, requestId: updatedRequest.id }, 'Task failed after all retries');
            });

            return updatedRequest;
        }),

    // Prune old requests
    prune: adminProcedure
        .input(
            z.object({
                amount: z.number().int().min(1),
                unit: z.enum(['minutes', 'hours', 'days', 'months']),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { amount, unit } = input;
            const now = new Date();
            let olderThan: Date;

            switch (unit) {
                case 'minutes':
                    olderThan = subMinutes(now, amount);
                    break;
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

            const result = await ctx.db.delete(requests)
                .where(lt(requests.createdAt, olderThan));

            // Drizzle doesn't return count directly, we would need to query before delete
            // For simplicity, return success without count
            return { success: true, count: 0 };
        }),

    // Clear all requests
    clearAll: adminProcedure
        .mutation(async ({ ctx }) => {
            await ctx.db.delete(requests);
            return { success: true, count: 0 };
        }),
});
