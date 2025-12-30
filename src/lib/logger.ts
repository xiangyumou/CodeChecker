import pino from 'pino';

/**
 * Centralized logger for the application
 * Uses Pino for fast, structured logging with configurable levels
 */

// Determine log level from environment, default to 'info'
const logLevel = process.env.LOG_LEVEL || 'info';

// Check if pretty printing is enabled (development mode)
const isPretty = process.env.NODE_ENV === 'development';

// Create the base logger instance
const logger = pino({
    level: logLevel,
    // Pretty print in development, JSON in production
    transport: isPretty
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname',
                singleLine: false,
            },
        }
        : undefined,
    // Base configuration
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
});

/**
 * Create a child logger with additional context
 * @param context - Context object to be included in all logs
 * @returns Child logger instance
 */
export function createLogger(context: Record<string, unknown>) {
    return logger.child(context);
}

/**
 * Prisma-compatible log function
 * Converts Prisma log events to structured Pino logs
 */
export function prismaLogHandler(event: {
    message: string;
    target: string;
    timestamp: Date;
}) {
    const { message, target, timestamp } = event;
    logger.debug({
        msg: message,
        target,
        timestamp,
        source: 'prisma',
    });
}

export default logger;
