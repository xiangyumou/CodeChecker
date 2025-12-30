import { initTRPC } from '@trpc/server';
import { prisma } from '@/lib/db';
import superjson from 'superjson';

// Create context for tRPC
export const createTRPCContext = async (opts: { headers: Headers }) => {
    return {
        prisma,
        headers: opts.headers,
    };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
    transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
    const token = ctx.headers.get('x-admin-token');
    if (token !== process.env.SETTINGS_TOKEN) {
        throw new Error('UNAUTHORIZED');
    }
    return next({ ctx });
});
