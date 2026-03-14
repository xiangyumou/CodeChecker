/**
 * 分析任务处理器 - 简化版（单次 API 调用）
 */

import { db } from '@/lib/db';
import { requests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getPrompt } from '@/lib/prompts/loader';
import OpenAI from 'openai';
import { config } from '@/lib/settings';

export async function processAnalysisTask(requestId: number): Promise<void> {
    try {
        // 加载请求
        const request = await db.select().from(requests).where(eq(requests.id, requestId)).limit(1).then(rows => rows[0]);

        if (!request) {
            console.warn(`Request ${requestId} not found`);
            return;
        }

        // 幂等性检查
        if (request.status === 'COMPLETED' || request.status === 'FAILED') {
            return;
        }

        // 更新为处理中
        await db.update(requests).set({ status: 'PROCESSING' }).where(eq(requests.id, requestId));

        const apiKey = config.OPENAI_API_KEY;
        const baseURL = config.OPENAI_BASE_URL;
        const model = config.OPENAI_MODEL;

        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not configured');
        }

        // 初始化 OpenAI 客户端
        const openai = new OpenAI({ apiKey, baseURL });

        const imageReferences = (request.imageReferences as string[]) || [];

        // 检查 vision 支持
        if (imageReferences.length > 0 && !config.MODEL_SUPPORTS_VISION) {
            throw new Error('Model does not support vision');
        }

        // 加载综合 prompt
        const systemPrompt = await getPrompt('analysis');

        // 准备用户内容
        const contentParts: OpenAI.Chat.ChatCompletionContentPart[] = [];
        if (request.userPrompt) {
            contentParts.push({ type: 'text', text: request.userPrompt });
        }
        imageReferences.forEach((url: string) => {
            contentParts.push({ type: 'image_url', image_url: { url } });
        });
        if (contentParts.length === 0) {
            contentParts.push({ type: 'text', text: 'No problem description provided.' });
        }

        // 单次 API 调用完成所有分析
        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: contentParts },
            ],
            response_format: { type: 'json_object' },
        }, {
            timeout: config.REQUEST_TIMEOUT_SECONDS * 1000,
        });

        const responseContent = response.choices[0]?.message?.content;
        if (!responseContent) {
            throw new Error('Empty response from API');
        }

        const result = JSON.parse(responseContent);

        // 保存结果
        await db.update(requests).set({
            status: 'COMPLETED',
            analysisResult: result,
            isSuccess: true,
            errorMessage: null,
            gptRawResponse: result,
        }).where(eq(requests.id, requestId));

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Task ${requestId} failed:`, error);

        await db.update(requests).set({
            status: 'FAILED',
            errorMessage,
            isSuccess: false,
        }).where(eq(requests.id, requestId));

        throw error;
    }
}
