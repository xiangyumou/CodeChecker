import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const [requests, total] = await Promise.all([
            prisma.request.findMany({
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
            prisma.request.count(),
        ]);

        return NextResponse.json({
            data: requests,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        await logger.error(`Failed to fetch requests: ${error}`, 'API_GET_REQUESTS');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
