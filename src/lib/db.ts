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
// Subscribe to Prisma log events and route to our logger
prisma.$on('error' as never, (e: Prisma.LogEvent) => {
    logger.error({
        msg: e.message,
        target: e.target,
        source: 'prisma',
    });
});

prisma.$on('warn' as never, (e: Prisma.LogEvent) => {
    logger.warn({
        msg: e.message,
        target: e.target,
        source: 'prisma',
    });
});

// Only log slow queries (>200ms) in development
if (process.env.NODE_ENV === 'development') {
    prisma.$on('query' as never, (e: Prisma.QueryEvent) => {
        // Only log if query took longer than 200ms
        if (e.duration > 200) {
            logger.debug({
                msg: `Slow query detected (${e.duration}ms)`,
                query: e.query,
                duration: e.duration,
                target: e.target,
                source: 'prisma',
            });
        }
    });
}


if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
