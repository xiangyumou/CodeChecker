import { describe, test, expect } from 'vitest';
import { appRouter } from '@/server/routers'; // Assuming this imports the merged router
import { createTRPCContext } from '@/server/trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/db';

// Mock dependencies if needed, but integration test is better if DB is set up.
// For now, we mainly want to test the GUARD (adminProcedure), so we might not even reach the DB.
// If the guard works, it throws UNAUTHORIZED before hitting the logic.

describe('Security Audit Tests', () => {

    // Create a context WITHOUT the admin token
    const publicContext = {
        prisma,
        headers: new Headers(), // Empty headers, no x-admin-token
    };

    const caller = appRouter.createCaller(publicContext);

    test('requests.list should throw UNAUTHORIZED without token', async () => {
        await expect(caller.requests.list({ take: 10 })).rejects.toThrow('UNAUTHORIZED');
    });

    test('requests.delete should throw UNAUTHORIZED without token', async () => {
        await expect(caller.requests.delete(123)).rejects.toThrow('UNAUTHORIZED');
    });

    test('requests.prune should throw UNAUTHORIZED without token', async () => {
        await expect(caller.requests.prune({ amount: 1, unit: 'hours' })).rejects.toThrow('UNAUTHORIZED');
    });

    test('settings.getByKey should throw UNAUTHORIZED without token', async () => {
        await expect(caller.settings.getByKey('OPENAI_API_KEY')).rejects.toThrow('UNAUTHORIZED');
    });

    test('requests.create should be public (validation error, not auth error)', async () => {
        // When calling create without proper auth, it should NOT throw UNAUTHORIZED
        // Instead, it may throw validation error for missing required fields,
        // which proves the endpoint is publicly accessible

        try {
            await caller.requests.create({ userPrompt: '' }); // Empty prompt to trigger validation
        } catch (e: any) {
            // Should NOT be an UNAUTHORIZED error
            expect(e.code).not.toBe('UNAUTHORIZED');
            // It MUST be a BAD_REQUEST (Validation Error in TRPC)
            expect(e.code).toBe('BAD_REQUEST');
            // Zod error details should be present
            const zodError = JSON.parse(e.message);
            expect(zodError).toMatchObject([
                {
                    message: "Either userPrompt or imageReferences must be provided",
                    path: ["userPrompt"]
                }
            ]);
        }
    });

});
