import { PrismaClient } from '@prisma/client';
import logger from './logger';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: [
        // Only log errors and warnings by default
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
        // Log slow queries (>200ms) in development
        ...(process.env.NODE_ENV === 'development'
            ? [{ level: 'query' as const, emit: 'event' as const } as const]
            : []),
    ],
});

// Subscribe to Prisma log events and route to our logger
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prisma as unknown as any).$on('error', (e: any) => {
    logger.error({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        msg: (e as any).message,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        target: (e as any).target,
        source: 'prisma',
    });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prisma as unknown as any).$on('warn', (e: any) => {
    logger.warn({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        msg: (e as any).message,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        target: (e as any).target,
        source: 'prisma',
    });
});

// Only log slow queries (>200ms) in development
if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as unknown as any).$on('query', (e: any) => {
        // Only log if query took longer than 200ms
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((e as any).duration > 200) {
            logger.debug({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                msg: `Slow query detected (${(e as any).duration}ms)`,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                query: (e as any).query,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                duration: (e as any).duration,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                target: (e as any).target,
                source: 'prisma',
            });
        }
    });
}


if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
