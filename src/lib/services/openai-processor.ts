import OpenAI from 'openai';
import { prisma } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { getPrompt } from '../prompts/loader';
import logger, { createLogger } from '@/lib/logger';

// Event emitter for real-time updates
export const requestUpdateEmitter = new EventEmitter();

// Cache for system prompt
let systemPromptCache: string | null = null;

async function getSystemPrompt(): Promise<string> {
    if (systemPromptCache) return systemPromptCache;

    const promptPath = path.join(process.cwd(), 'prompt.txt');
    try {
        systemPromptCache = await fs.readFile(promptPath, 'utf-8');
        return systemPromptCache;
    } catch (error) {
        logger.error({ err: error, promptPath }, 'Error reading prompt.txt');
        throw new Error('System prompt file not found. Please create prompt.txt in project root.');
    }
}

export async function processAnalysisRequest(requestId: number) {
    try {
        // Get request from database
        const request = await prisma.request.findUnique({
            where: { id: requestId },
        });

        if (!request) {
            logger.error({ requestId }, 'Request not found');
            return;
        }

        // Update status to PROCESSING
        await prisma.request.update({
            where: { id: requestId },
            data: { status: 'PROCESSING' },
        });

        // Emit update event
        requestUpdateEmitter.emit('request_updated', {
            id: requestId,
            status: 'PROCESSING',
        });

        // Get settings from DB or environment variables
        const settings = await prisma.setting.findMany();
        const settingsMap = settings.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {} as Record<string, string>);

        const apiKey = settingsMap['OPENAI_API_KEY'] || process.env.OPENAI_API_KEY;
        const baseURL = settingsMap['OPENAI_BASE_URL'] || process.env.OPENAI_BASE_URL;
        const model = settingsMap['OPENAI_MODEL'] || process.env.OPENAI_MODEL || 'gpt-4o';
        const supportsVision = (settingsMap['MODEL_SUPPORTS_VISION'] || process.env.MODEL_SUPPORTS_VISION || 'true').toLowerCase() === 'true';
        const timeoutSeconds = parseInt(settingsMap['REQUEST_TIMEOUT_SECONDS'] || process.env.REQUEST_TIMEOUT_SECONDS || '180');
        const timeout = timeoutSeconds * 1000;

        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is not set');
        }

        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey,
            baseURL,
        });

        // Parse image references if present
        const imageReferences = request.imageReferences
            ? JSON.parse(request.imageReferences)
            : [];

        // Validate vision support if images are present
        if (imageReferences.length > 0 && !supportsVision) {
            throw new Error('Model does not support vision/image inputs. Please enable MODEL_SUPPORTS_VISION or remove images from request.');
        }

        // Load prompts
        const [step1Prompt, step2Prompt, step3Prompt] = await Promise.all([
            getPrompt('step1-problem'),
            getPrompt('step2-code'),
            getPrompt('step3-analysis'),
        ]);

        // --- Stage 1 & 2: Parallel Pre-processing ---

        // Prepare inputs
        // Step 1 input: user prompt + images
        const step1ContentParts: OpenAI.Chat.ChatCompletionContentPart[] = [];
        if (request.userPrompt) step1ContentParts.push({ type: 'text', text: request.userPrompt });
        imageReferences.forEach((url: string) => {
            step1ContentParts.push({ type: 'image_url', image_url: { url } });
        });
        if (step1ContentParts.length === 0) step1ContentParts.push({ type: 'text', text: 'No problem description provided.' });

        // Step 2 input: user source code - wait, we need to extract source code from the request.
        // In the previous model, user provided "Source Code" often as part of the prompt or maybe not separated?
        // Re-reading the "prompt.txt": "用户提供 ACM问题描述 (文字/图片转文字) 和/或 源代码"
        // It seems everything is mixed in userPrompt?
        // If so, we pass the SAME input to both Step 1 and Step 2?
        // Step 1: "Extract Problem" from (Prompt + Images)
        // Step 2: "Clean and Format Code" from (Prompt) -> Images usually don't contain code text to be formatted, but maybe OCR?
        // Let's pass the same text content to Step 2.

        const step2Content = request.userPrompt || '';

        // Define tasks
        const task1_Problem = (async () => {
            try {
                logger.info({ requestId, stage: 1 }, 'Starting Step 1: Problem Extraction');

                // Update stage 1 status to processing
                await prisma.request.update({
                    where: { id: requestId },
                    data: { stage1Status: 'processing' },
                });
                requestUpdateEmitter.emit('request_updated', { id: requestId, status: 'PROCESSING' });

                const response = await openai.chat.completions.create({
                    model: model, // Use configured model
                    messages: [
                        { role: 'system', content: step1Prompt },
                        { role: 'user', content: step1ContentParts }, // Multimodal
                    ],
                    response_format: { type: 'json_object' },
                });
                const result = response.choices[0]?.message?.content || '{}';
                logger.info({ requestId, stage: 1 }, 'Step 1 completed');

                // Update DB immediately with completed status
                await prisma.request.update({
                    where: { id: requestId },
                    data: {
                        problemDetails: result,
                        stage1Status: 'completed',
                        stage1CompletedAt: new Date(),
                    },
                });
                requestUpdateEmitter.emit('request_updated', { id: requestId, status: 'PROCESSING' }); // Trigger frontend refresh
                return JSON.parse(result);
            } catch (error) {
                logger.error({ requestId, stage: 1, err: error }, 'Step 1 failed');
                await prisma.request.update({
                    where: { id: requestId },
                    data: { stage1Status: 'failed' },
                });
                throw error;
            }
        })();

        const task2_Code = (async () => {
            try {
                logger.info({ requestId, stage: 2 }, 'Starting Step 2: Code Formatting');

                // Update stage 2 status to processing
                await prisma.request.update({
                    where: { id: requestId },
                    data: { stage2Status: 'processing' },
                });
                requestUpdateEmitter.emit('request_updated', { id: requestId, status: 'PROCESSING' });

                // Step 2 only needs text usually, but if code is in image? 
                // Ideally we use multimodal for code too if code is in screenshot.
                // Let's use same inputs as Step 1 for robustness.
                const response = await openai.chat.completions.create({
                    model: model, // Use configured model
                    messages: [
                        { role: 'system', content: step2Prompt },
                        { role: 'user', content: step1ContentParts },
                    ],
                    response_format: { type: 'json_object' },
                });
                const content = response.choices[0]?.message?.content || '{}';
                const json = JSON.parse(content);
                const formattedCode = json.code || '';
                logger.info({ requestId, stage: 2 }, 'Step 2 completed');

                // Update DB immediately with completed status
                await prisma.request.update({
                    where: { id: requestId },
                    data: {
                        formattedCode: formattedCode,
                        stage2Status: 'completed',
                        stage2CompletedAt: new Date(),
                    },
                });
                requestUpdateEmitter.emit('request_updated', { id: requestId, status: 'PROCESSING' });
                return formattedCode;
            } catch (error) {
                logger.error({ requestId, stage: 2, err: error }, 'Step 2 failed');
                await prisma.request.update({
                    where: { id: requestId },
                    data: { stage2Status: 'failed' },
                });
                throw error;
            }
        })();

        // Execute Parallel
        const [problemData, formattedCode] = await Promise.all([task1_Problem, task2_Code]);

        // --- Stage 3: Deep Analysis ---
        logger.info({ requestId, stage: 3 }, 'Starting Step 3: Deep Analysis');

        // Update stage 3 status to processing
        await prisma.request.update({
            where: { id: requestId },
            data: { stage3Status: 'processing' },
        });
        requestUpdateEmitter.emit('request_updated', { id: requestId, status: 'PROCESSING' });

        const step3Input = JSON.stringify({
            problem: problemData,
            user_code: formattedCode
        });

        const step3Response = await (async () => {
            try {
                return await openai.chat.completions.create(
                    {
                        model: model, // Use high quality model (gpt-4o)
                        messages: [
                            { role: 'system', content: step3Prompt },
                            { role: 'user', content: step3Input },
                        ],
                        response_format: { type: 'json_object' },
                    },
                    {
                        timeout,
                    }
                );
            } catch (error) {
                logger.error({ requestId, stage: 3, err: error }, 'Step 3 failed');
                await prisma.request.update({
                    where: { id: requestId },
                    data: { stage3Status: 'failed' },
                });
                throw error;
            }
        })();

        const analysisContent = step3Response.choices[0]?.message?.content;
        if (!analysisContent) throw new Error('Empty response from Step 3');

        // Update request as COMPLETED
        await prisma.request.update({
            where: { id: requestId },
            data: {
                status: 'COMPLETED',
                analysisResult: analysisContent,
                stage3Status: 'completed',
                stage3CompletedAt: new Date(),
                isSuccess: true,
                errorMessage: null,
                // Legacy support (optional, can be removed)
                gptRawResponse: JSON.stringify({
                    organized_problem: problemData,
                    modified_code: JSON.parse(analysisContent).modified_code, // This might need extracting
                    modification_analysis: JSON.parse(analysisContent).modification_analysis,
                    original_code: formattedCode
                })
            },
        });

        // Emit update event
        requestUpdateEmitter.emit('request_updated', {
            id: requestId,
            status: 'COMPLETED',
        });

        logger.info({ requestId }, 'Request completed successfully');
    } catch (error) {
        logger.error({ requestId, err: error }, 'Error processing request');

        // Update request as FAILED
        await prisma.request.update({
            where: { id: requestId },
            data: {
                status: 'FAILED',
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                isSuccess: false,
            },
        });

        // Emit update event
        requestUpdateEmitter.emit('request_updated', {
            id: requestId,
            status: 'FAILED',
        });
    }
}
