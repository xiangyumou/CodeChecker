'use server';

import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Simple settings that can be stored in DB (for prompts mainly)
export async function getAllSettings(): Promise<Record<string, string>> {
    const allSettings = await db.select().from(settings);
    return allSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
    }, {} as Record<string, string>);
}

export async function getSettingByKey(key: string): Promise<string | null> {
    const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return result[0]?.value || null;
}

export async function upsertSetting(key: string, value: string) {
    const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

    if (existing[0]) {
        const result = await db.update(settings)
            .set({ value })
            .where(eq(settings.key, key))
            .returning();
        return result[0];
    } else {
        const result = await db.insert(settings).values({ key, value }).returning();
        return result[0];
    }
}

export async function deleteSetting(key: string) {
    try {
        await db.delete(settings).where(eq(settings.key, key));
        return { success: true };
    } catch {
        return { success: false };
    }
}
