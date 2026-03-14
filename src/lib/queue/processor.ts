/**
 * 分析任务处理器 - 简化版
 */

import { db } from '@/lib/db';
import { requests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getPrompt } from '@/lib/prompts/loader';
import OpenAI from 'openai';
import { getAllSettings } from '@/lib/settings';

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

        // 加载配置
        const settings = getAllSettings();

        const apiKey = settings.OPENAI_API_KEY;
        const baseURL = settings.OPENAI_BASE_URL;
        const model = settings.OPENAI_MODEL || 'gpt-4o';
        const timeoutSeconds = parseInt(settings.REQUEST_TIMEOUT_SECONDS || '180');

        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not configured');
        }

        // 初始化 OpenAI 客户端
        const openai = new OpenAI({ apiKey, baseURL });

        const imageReferences = (request.imageReferences as unknown as string[]) || [];

        // 加载 prompts
        const [step1Prompt, step2Prompt, step3Prompt] = await Promise.all([
            getPrompt('step1-problem'),
            getPrompt('step2-code'),
            getPrompt('step3-analysis'),
        ]);

        // 准备内容
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

        // Step 1 & 2: 并行执行
        const [step1Response, step2Response] = await Promise.all([
            openai.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: step1Prompt },
                    { role: 'user', content: contentParts },
                ],
                response_format: { type: 'json_object' },
            }),
            openai.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: step2Prompt },
                    { role: 'user', content: contentParts },
                ],
                response_format: { type: 'json_object' },
            }),
        ]);

        const problemData = JSON.parse(step1Response.choices[0]?.message?.content || '{}');
        const codeData = JSON.parse(step2Response.choices[0]?.message?.content || '{}');
        const formattedCode = codeData.code || '';

        // Step 3: 深度分析
        const step3Input = JSON.stringify({
            problem: problemData,
            user_code: formattedCode,
        });

        const step3Response = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: step3Prompt },
                { role: 'user', content: step3Input },
            ],
            response_format: { type: 'json_object' },
        }, {
            timeout: timeoutSeconds * 1000,
        });

        const analysisContent = step3Response.choices[0]?.message?.content;
        if (!analysisContent) {
            throw new Error('Empty response from Step 3');
        }

        const analysisJson = JSON.parse(analysisContent);

        // 保存结果
        await db.update(requests).set({
            status: 'COMPLETED',
            problemDetails: problemData,
            formattedCode,
            analysisResult: analysisJson,
            isSuccess: true,
            errorMessage: null,
            gptRawResponse: {
                organized_problem: problemData,
                modified_code: analysisJson.modified_code,
                modification_analysis: analysisJson.modification_analysis,
                original_code: formattedCode,
            },
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
