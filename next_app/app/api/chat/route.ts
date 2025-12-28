import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const maxDuration = 60;

// Initialize OpenAI client with custom settings
const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
});


export async function POST(req: Request) {
    try {
        const { messages, userPrompt, imageReferences } = await req.json();

        // Create Request entry in DB
        const dbRequest = await prisma.request.create({
            data: {
                user_prompt: userPrompt || messages[messages.length - 1].content,
                image_references: imageReferences ? JSON.stringify(imageReferences) : null,
                status: 'Processing',
                created_at: new Date(),
            },
        });

        await logger.info(`Started processing request ID ${dbRequest.id}`, 'API_CHAT');

        const result = await streamText({
            model: openai('gpt-4-turbo'), // Or compatible model
            messages,
            onFinish: async ({ text, finishReason }) => {
                const isSuccess = finishReason !== 'error';
                const status = isSuccess ? 'Completed' : 'Failed';

                await prisma.request.update({
                    where: { id: dbRequest.id },
                    data: {
                        status,
                        gpt_raw_response: text,
                        is_success: isSuccess,
                        updated_at: new Date(),
                    },
                });

                if (isSuccess) {
                    await logger.info(`Completed request ID ${dbRequest.id}`, 'API_CHAT');
                } else {
                    await logger.error(`Request ID ${dbRequest.id} failed with reason: ${finishReason}`, 'API_CHAT');
                }
            },
        });

        return result.toDataStreamResponse();
    } catch (error) {
        await logger.error(`Chat API error: ${error}`, 'API_CHAT');
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
