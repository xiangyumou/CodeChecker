// 简化版配置系统 - 直接从环境变量读取

/**
 * 应用配置对象
 * 直接从环境变量读取，无需函数封装
 */
export const config = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || '',
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
    MODEL_SUPPORTS_VISION: process.env.MODEL_SUPPORTS_VISION !== 'false',
    REQUEST_TIMEOUT_SECONDS: parseInt(process.env.REQUEST_TIMEOUT_SECONDS || '180'),
    MAX_CONCURRENT_ANALYSIS_TASKS: parseInt(process.env.MAX_CONCURRENT_ANALYSIS_TASKS || '3'),
    MAX_OUTPUT_TOKENS: parseInt(process.env.MAX_OUTPUT_TOKENS || '16384'),
} as const;
