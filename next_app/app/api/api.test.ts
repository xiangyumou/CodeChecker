/**
 * @vitest-environment node
 */
import { expect, test, describe, vi } from 'vitest';
import { GET as getRequests } from './requests/route';
import { GET as getRequest, DELETE as deleteRequest } from './requests/[id]/route';
import { POST as chatHandler } from './chat/route';
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@ai-sdk/openai', () => ({
    openai: vi.fn(),
}));

vi.mock('ai', () => ({
    streamText: vi.fn().mockResolvedValue({
        toDataStreamResponse: () => new Response('Stream data'),
    }),
}));

describe('Backend API Routes', () => {
    test('GET /api/requests returns paginated data', async () => {
        // Seed data
        await prisma.request.create({ data: { user_prompt: 'Test 1', status: 'Completed' } });

        const req = new NextRequest('http://localhost/api/requests?page=1&limit=5');
        const res = await getRequests(req);
        const json = await res.json();

        expect(json.data).toBeDefined();
        expect(Array.isArray(json.data)).toBe(true);
        expect(json.pagination).toBeDefined();
        expect(json.pagination.total).toBeGreaterThanOrEqual(1);

        // Cleanup
        const created = await prisma.request.findFirst({ where: { user_prompt: 'Test 1' } });
        if (created) await prisma.request.delete({ where: { id: created.id } });
    });

    test('POST /api/chat creates a request entry', async () => {
        const req = new Request('http://localhost/api/chat', {
            method: 'POST',
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Hello AI' }],
            }),
        });

        const res = await chatHandler(req);
        expect(res).toBeDefined();

        // Verify DB entry
        const dbEntry = await prisma.request.findFirst({
            where: { user_prompt: 'Hello AI' },
            orderBy: { created_at: 'desc' }
        });

        expect(dbEntry).toBeDefined();
        expect(dbEntry?.status).toBe('Processing');

        if (dbEntry) await prisma.request.delete({ where: { id: dbEntry.id } });
    });
});
