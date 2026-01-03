import { describe, test, expect } from 'vitest';
import { appRouter } from '@/server/routers'; // Assuming this imports the merged router
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

    // Note: requests.list and requests.getById are public (no auth required)
    // Only destructive operations require adminProcedure

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
        } catch (e) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const error = e as any;
            // Should NOT be an UNAUTHORIZED error
            expect(error.code).not.toBe('UNAUTHORIZED');
            // It MUST be a BAD_REQUEST (Validation Error in TRPC)
            expect(error.code).toBe('BAD_REQUEST');
            // Zod error details should be present
            const zodError = JSON.parse(error.message);
            expect(zodError).toMatchObject([
                {
                    message: "Either userPrompt or imageReferences must be provided",
                    path: ["userPrompt"]
                }
            ]);
        }
    });

});
