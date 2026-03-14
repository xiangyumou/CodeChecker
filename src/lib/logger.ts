// 简化版日志记录器 - 直接使用 console

export function createLogger(context: Record<string, unknown>) {
    return {
        info: (msg: string, ...args: unknown[]) => console.log(`[INFO] ${msg}`, ...args, context),
        warn: (msg: string, ...args: unknown[]) => console.warn(`[WARN] ${msg}`, ...args, context),
        error: (msg: string, ...args: unknown[]) => console.error(`[ERROR] ${msg}`, ...args, context),
        debug: (msg: string, ...args: unknown[]) => console.debug(`[DEBUG] ${msg}`, ...args, context),
    };
}

const logger = {
    info: (msg: string, ...args: unknown[]) => console.log(`[INFO] ${msg}`, ...args),
    warn: (msg: string, ...args: unknown[]) => console.warn(`[WARN] ${msg}`, ...args),
    error: (msg: string, ...args: unknown[]) => console.error(`[ERROR] ${msg}`, ...args),
    debug: (msg: string, ...args: unknown[]) => console.debug(`[DEBUG] ${msg}`, ...args),
};

export default logger;
