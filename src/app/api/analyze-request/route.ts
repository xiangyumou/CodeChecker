import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { prisma } from '@/lib/db';
import { getPrompt } from '@/lib/prompts/loader';
import logger from '@/lib/logger';
import OpenAI from 'openai';

/**
 * QStash webhook handler for processing code analysis requests
 * This endpoint is called by QStash to process analysis tasks asynchronously
 */
async function handler(req: NextRequest) {
    try {
        const body = await req.json();
        const { requestId } = body;

        if (!requestId || typeof requestId !== 'number') {
            return NextResponse.json(
                { error: 'Invalid requestId' },
                { status: 400 }
            );
        }

        logger.info({ requestId }, 'QStash task received: code/analyze');

        // Load request and configuration
        const request = await prisma.request.findUnique({
            where: { id: requestId },
        });

        if (!request) {
            logger.error({ requestId }, 'Request not found');
            return NextResponse.json(
                { error: `Request ${requestId} not found` },
                { status: 404 }
            );
        }

        // Update status to PROCESSING
        await prisma.request.update({
            where: { id: requestId },
            data: { status: 'PROCESSING' },
        });

        // Load settings
        const settings = await prisma.setting.findMany();
        const settingsMap = settings.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {} as Record<string, string>);

        const apiKey = settingsMap['OPENAI_API_KEY'] || process.env.OPENAI_API_KEY;
        const baseURL = settingsMap['OPENAI_BASE_URL'] || process.env.OPENAI_BASE_URL;
        const model = settingsMap['OPENAI_MODEL'] || process.env.OPENAI_MODEL || 'gpt-4o';
        const supportsVision = (
            settingsMap['MODEL_SUPPORTS_VISION'] ||
            process.env.MODEL_SUPPORTS_VISION ||
            'true'
        ).toLowerCase() === 'true';
        const timeoutSeconds = parseInt(
            settingsMap['REQUEST_TIMEOUT_SECONDS'] ||
            process.env.REQUEST_TIMEOUT_SECONDS ||
            '180'
        );

        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not configured');
        }

        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey,
            baseURL,
        });

        const imageReferences = request.imageReferences
            ? JSON.parse(request.imageReferences)
            : [];

        if (imageReferences.length > 0 && !supportsVision) {
            throw new Error('Model does not support vision/image inputs');
        }

        // Load prompts
        const [step1Prompt, step2Prompt, step3Prompt] = await Promise.all([
            getPrompt('step1-problem'),
            getPrompt('step2-code'),
            getPrompt('step3-analysis'),
        ]);

        // Prepare content for Step 1 & 2
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

        // Step 1: Extract Problem
        logger.info({ requestId, stage: 1 }, 'Starting Step 1: Problem Extraction');
        await prisma.request.update({
            where: { id: requestId },
            data: { stage1Status: 'processing' },
        });

        const step1Response = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: step1Prompt },
                { role: 'user', content: contentParts },
            ],
            response_format: { type: 'json_object' },
        });

        const problemData = JSON.parse(step1Response.choices[0]?.message?.content || '{}');

        await prisma.request.update({
            where: { id: requestId },
            data: {
                problemDetails: JSON.stringify(problemData),
                stage1Status: 'completed',
                stage1CompletedAt: new Date(),
            },
        });

        // Step 2: Format Code
        logger.info({ requestId, stage: 2 }, 'Starting Step 2: Code Formatting');
        await prisma.request.update({
            where: { id: requestId },
            data: { stage2Status: 'processing' },
        });

        const step2Response = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: step2Prompt },
                { role: 'user', content: contentParts },
            ],
            response_format: { type: 'json_object' },
        });

        const codeData = JSON.parse(step2Response.choices[0]?.message?.content || '{}');
        const formattedCode = codeData.code || '';

        await prisma.request.update({
            where: { id: requestId },
            data: {
                formattedCode,
                stage2Status: 'completed',
                stage2CompletedAt: new Date(),
            },
        });

        // Step 3: Deep Analysis
        logger.info({ requestId, stage: 3 }, 'Starting Step 3: Deep Analysis');
        await prisma.request.update({
            where: { id: requestId },
            data: { stage3Status: 'processing' },
        });

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

        // Update final status
        await prisma.request.update({
            where: { id: requestId },
            data: {
                status: 'COMPLETED',
                analysisResult: analysisContent,
                stage3Status: 'completed',
                stage3CompletedAt: new Date(),
                isSuccess: true,
                errorMessage: null,
                // Legacy compatibility
                gptRawResponse: JSON.stringify({
                    organized_problem: problemData,
                    modified_code: JSON.parse(analysisContent).modified_code,
                    modification_analysis: JSON.parse(analysisContent).modification_analysis,
                    original_code: formattedCode,
                }),
            },
        });

        logger.info({ requestId }, 'Request completed successfully via QStash');

        return NextResponse.json({
            success: true,
            requestId,
            message: 'Analysis completed',
        });

    } catch (error: any) {
        logger.error({ err: error }, 'QStash task failed');

        // Try to update request status if we have requestId
        const body = await req.json().catch(() => ({}));
        if (body.requestId) {
            await prisma.request.update({
                where: { id: body.requestId },
                data: {
                    status: 'FAILED',
                    errorMessage: error.message,
                    isSuccess: false,
                },
            }).catch(() => {
                // Ignore errors updating status
            });
        }

        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    // Verify QStash signature
    const receiver = new Receiver({
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
    });

    const signature = req.headers.get('upstash-signature');
    const body = await req.text();

    try {
        await receiver.verify({
            signature: signature!,
            body,
        });
    } catch (error) {
        logger.error({ err: error }, 'QStash signature verification failed');
        return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 401 }
        );
    }

    // Parse body and call handler
    const parsedBody = JSON.parse(body);
    const mockReq = {
        ...req,
        json: async () => parsedBody,
    } as NextRequest;

    return handler(mockReq);
}
