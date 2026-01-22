/**
 * Shared test helpers for authorization testing
 *
 * Usage:
 * ```ts
 * import { testUnauthorized } from './helpers/auth-test-helper';
 *
 * testUnauthorized(caller, 'settings.getAll', () => caller.settings.getAll());
 * ```
 */

/**
 * Test that a procedure throws UNAUTHORIZED without proper token
 * @param caller - The tRPC caller without auth
 * @param procedureName - Name of the procedure for test description
 * @param call - Function that calls the procedure
 */
export function testUnauthorized(
    caller: any,
    procedureName: string,
    call: () => Promise<unknown>
) {
    test(`${procedureName} should throw UNAUTHORIZED without token`, async () => {
        await expect(call()).rejects.toThrow('UNAUTHORIZED');
    });
}

/**
 * Create a public context (no admin token) for testing auth guards
 */
export function createPublicContext(prisma: any) {
    return {
        prisma,
        headers: new Headers(), // Empty headers, no x-admin-token
    };
}
