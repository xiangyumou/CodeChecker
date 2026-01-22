import { describe, test, expect } from 'vitest';
import { appRouter } from '@/server/routers';
import { prisma } from '@/lib/db';
import { testUnauthorized, createPublicContext } from './helpers/auth-test-helper';

describe('Security Audit Tests', () => {
    const publicContext = createPublicContext(prisma);
    const caller = appRouter.createCaller(publicContext);

    // Test destructive operations require auth
    testUnauthorized(caller, 'requests.delete', () => caller.requests.delete(123));
    testUnauthorized(caller, 'requests.prune', () => caller.requests.prune({ amount: 1, unit: 'hours' }));
    testUnauthorized(caller, 'settings.getByKey', () => caller.settings.getByKey('OPENAI_API_KEY'));

    // Test that public endpoints don't require auth
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
