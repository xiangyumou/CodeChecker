/**
 * Helper function to map API errors to user-friendly messages
 * Currently optimized for Chinese UI, but should be integrated with i18n in the future
 */
export const getErrorMessage = (error: { message?: string }, defaultMsg: string): string => {
    const msg = error.message?.toLowerCase() || '';

    // API key errors
    if (msg.includes('api key') || msg.includes('unauthorized') || msg.includes('401')) {
        return 'API 密钥无效或未配置，请检查设置';
    }

    // Rate limit errors
    if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many requests')) {
        return '请求过于频繁，请稍后再试';
    }

    // Network errors
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
        return '网络连接失败，请检查网络设置';
    }

    // Timeout errors
    if (msg.includes('timeout') || msg.includes('timed out')) {
        return '请求超时，请稍后重试';
    }

    // Model errors
    if (msg.includes('model') || msg.includes('openai')) {
        return 'AI 模型调用失败，请检查 API 配置';
    }

    // Database errors
    if (msg.includes('database') || msg.includes('prisma')) {
        return '数据库连接失败，请联系管理员';
    }

    // Default error message
    return error.message || defaultMsg;
};
