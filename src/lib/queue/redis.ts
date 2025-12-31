import Redis from 'ioredis';
import logger from '@/lib/logger';

/**
 * Redis 客户端单例
 * 使用 ioredis（BullMQ 官方推荐）
 */

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),

    // BullMQ 推荐配置
    maxRetriesPerRequest: null,
    enableReadyCheck: false,

    // 重连策略
    retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn({ times, delay }, 'Redis reconnecting');
        return delay;
    },
});

// 连接事件监听
redis.on('connect', () => {
    logger.info('Redis connected');
});

redis.on('ready', () => {
    logger.info('Redis ready');
});

redis.on('error', (err) => {
    logger.error({ err }, 'Redis error');
});

redis.on('close', () => {
    logger.warn('Redis connection closed');
});

export default redis;
