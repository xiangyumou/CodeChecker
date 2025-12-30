import { NextResponse } from 'next/server';
import { CleanupService } from '@/lib/services/cleanup';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const result = await CleanupService.cleanup();
        return NextResponse.json({
            success: true,
            message: 'Cleanup process completed',
            data: result
        });
    } catch (error) {
        console.error('Cleanup API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
