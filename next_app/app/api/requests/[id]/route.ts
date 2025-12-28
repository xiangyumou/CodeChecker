import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const requestId = parseInt(id);

        if (isNaN(requestId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        const request = await prisma.request.findUnique({
            where: { id: requestId },
        });

        if (!request) {
            return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        }

        return NextResponse.json(request);
    } catch (error) {
        await logger.error(`Failed to fetch request: ${error}`, 'API_GET_REQUEST_ID');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const requestId = parseInt(id);

        if (isNaN(requestId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        await prisma.request.delete({
            where: { id: requestId },
        });

        await logger.info(`Deleted request ID ${requestId}`, 'API_DELETE_REQUEST');
        return NextResponse.json({ success: true });
    } catch (error) {
        await logger.error(`Failed to delete request: ${error}`, 'API_DELETE_REQUEST');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
