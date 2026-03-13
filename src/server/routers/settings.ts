import { z } from 'zod';
import { router, adminProcedure } from '../trpc';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const settingKeySchema = z.string().min(1);
const updateSettingSchema = z.object({
    key: z.string().min(1),
    value: z.string(),
});

export const settingsRouter = router({
    // Get all settings as key-value map
    getAll: adminProcedure.query(async ({ ctx }) => {
        const allSettings = await ctx.db.select().from(settings);
        return allSettings.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {} as Record<string, string>);
    }),

    // Get setting by key
    getByKey: adminProcedure
        .input(settingKeySchema)
        .query(async ({ ctx, input }) => {
            const result = await ctx.db.select().from(settings)
                .where(eq(settings.key, input))
                .limit(1);
            return result[0]?.value || null;
        }),

    // Update or create setting
    upsert: adminProcedure
        .input(updateSettingSchema)
        .mutation(async ({ ctx, input }) => {
            // Check if setting exists
            const existing = await ctx.db.select().from(settings)
                .where(eq(settings.key, input.key))
                .limit(1);

            if (existing[0]) {
                // Update existing
                const result = await ctx.db.update(settings)
                    .set({ value: input.value })
                    .where(eq(settings.key, input.key))
                    .returning();
                return result[0];
            } else {
                // Create new
                const result = await ctx.db.insert(settings).values({
                    key: input.key,
                    value: input.value,
                }).returning();
                return result[0];
            }
        }),

    // Batch update settings
    batchUpdate: adminProcedure
        .input(z.array(updateSettingSchema))
        .mutation(async ({ ctx, input }) => {
            const results = await Promise.all(
                input.map(async (item) => {
                    const existing = await ctx.db.select().from(settings)
                        .where(eq(settings.key, item.key))
                        .limit(1);

                    if (existing[0]) {
                        const result = await ctx.db.update(settings)
                            .set({ value: item.value })
                            .where(eq(settings.key, item.key))
                            .returning();
                        return result[0];
                    } else {
                        const result = await ctx.db.insert(settings).values({
                            key: item.key,
                            value: item.value,
                        }).returning();
                        return result[0];
                    }
                })
            );
            return results;
        }),

    // Delete setting (reset to default)
    delete: adminProcedure
        .input(settingKeySchema)
        .mutation(async ({ ctx, input }) => {
            try {
                await ctx.db.delete(settings).where(eq(settings.key, input));
                return { success: true };
            } catch {
                // Ignore if not found
                return { success: false };
            }
        }),
});
