'use server';

import { db } from '@/lib/db';
import { requests } from '@/lib/db/schema';
import { eq, desc, lt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { addAnalysisTask } from '@/lib/queue/memory-queue';
import { subMinutes, subHours, subDays, subMonths } from 'date-fns';

export interface RequestListItem {
    id: number;
    status: string;
    userPrompt: string | null;
    isSuccess: boolean;
    createdAt: Date | null;
    updatedAt: Date | null;
    errorMessage: string | null;
}

export async function listRequests(options?: { status?: string; limit?: number }): Promise<RequestListItem[]> {
    let query = db.select({
        id: requests.id,
        status: requests.status,
        userPrompt: requests.userPrompt,
        isSuccess: requests.isSuccess,
        createdAt: requests.createdAt,
        updatedAt: requests.updatedAt,
        errorMessage: requests.errorMessage,
    }).from(requests).orderBy(desc(requests.createdAt));

    if (options?.status) {
        query = query.where(eq(requests.status, options.status));
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    } else {
        query = query.limit(100);
    }

    return query;
}

export async function getRequestById(id: number) {
    const result = await db.select().from(requests).where(eq(requests.id, id)).limit(1);
    return result[0] || null;
}

export interface CreateRequestInput {
    userPrompt?: string;
    imageReferences?: string[];
}

export async function createRequest(data: CreateRequestInput) {
    // Validation
    if (!data.userPrompt && (!data.imageReferences || data.imageReferences.length === 0)) {
        throw new Error('Either userPrompt or imageReferences must be provided');
    }

    const result = await db.insert(requests).values({
        userPrompt: data.userPrompt,
        imageReferences: data.imageReferences ?? undefined,
        status: 'QUEUED',
        isSuccess: false,
    }).returning();

    const request = result[0];

    // Add task to memory queue (non-blocking)
    addAnalysisTask(request.id);

    revalidatePath('/');
    return request;
}

export async function deleteRequest(id: number) {
    const request = await db.select().from(requests).where(eq(requests.id, id)).limit(1).then(rows => rows[0]);

    if (!request) {
        throw new Error(`Request with ID ${id} not found`);
    }

    await db.delete(requests).where(eq(requests.id, id));
    revalidatePath('/');

    return { success: true, id };
}

export async function regenerateRequest(id: number) {
    const originalRequest = await db.select().from(requests).where(eq(requests.id, id)).limit(1).then(rows => rows[0]);

    if (!originalRequest) {
        throw new Error(`Request with ID ${id} not found`);
    }

    // Create new request with same prompt
    const result = await db.insert(requests).values({
        userPrompt: originalRequest.userPrompt,
        imageReferences: originalRequest.imageReferences as string[] | undefined,
        status: 'QUEUED',
        isSuccess: false,
    }).returning();

    const newRequest = result[0];

    // Add task to memory queue (non-blocking)
    addAnalysisTask(newRequest.id);

    revalidatePath('/');
    return newRequest;
}

export async function retryRequest(id: number) {
    const request = await db.select().from(requests).where(eq(requests.id, id)).limit(1).then(rows => rows[0]);

    if (!request) {
        throw new Error(`Request with ID ${id} not found`);
    }

    // Reset fields
    const result = await db.update(requests).set({
        status: 'QUEUED',
        isSuccess: false,
        errorMessage: null,
        gptRawResponse: null,
        formattedCode: null,
        problemDetails: null,
        analysisResult: null,
        stage1Status: 'pending',
        stage2Status: 'pending',
        stage3Status: 'pending',
        stage1CompletedAt: null,
        stage2CompletedAt: null,
        stage3CompletedAt: null,
    }).where(eq(requests.id, id)).returning();

    const updatedRequest = result[0];

    // Add task to memory queue (non-blocking)
    addAnalysisTask(updatedRequest.id);

    revalidatePath('/');
    return updatedRequest;
}

export async function pruneRequests(amount: number, unit: 'minutes' | 'hours' | 'days' | 'months') {
    const now = new Date();
    let olderThan: Date;

    switch (unit) {
        case 'minutes':
            olderThan = subMinutes(now, amount);
            break;
        case 'hours':
            olderThan = subHours(now, amount);
            break;
        case 'days':
            olderThan = subDays(now, amount);
            break;
        case 'months':
            olderThan = subMonths(now, amount);
            break;
    }

    await db.delete(requests).where(lt(requests.createdAt, olderThan));
    revalidatePath('/');

    return { success: true };
}

export async function clearAllRequests() {
    await db.delete(requests);
    revalidatePath('/');

    return { success: true };
}
