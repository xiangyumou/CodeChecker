import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc';

const settingKeySchema = z.string().min(1);
const updateSettingSchema = z.object({
    key: z.string().min(1),
    value: z.string(),
});

export const settingsRouter = router({
    // Get all settings as key-value map
    getAll: adminProcedure.query(async ({ ctx }) => {
        const settings = await ctx.prisma.setting.findMany();
        return settings.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {} as Record<string, string>);
    }),

    // Get setting by key
    getByKey: adminProcedure
        .input(settingKeySchema)
        .query(async ({ ctx, input }) => {
            const setting = await ctx.prisma.setting.findUnique({
                where: { key: input },
            });
            return setting?.value || null;
        }),

    // Update or create setting
    upsert: adminProcedure
        .input(updateSettingSchema)
        .mutation(async ({ ctx, input }) => {
            const setting = await ctx.prisma.setting.upsert({
                where: { key: input.key },
                update: { value: input.value },
                create: {
                    key: input.key,
                    value: input.value,
                },
            });
            return setting;
        }),

    // Batch update settings
    batchUpdate: adminProcedure
        .input(z.array(updateSettingSchema))
        .mutation(async ({ ctx, input }) => {
            const results = await Promise.all(
                input.map((item) =>
                    ctx.prisma.setting.upsert({
                        where: { key: item.key },
                        update: { value: item.value },
                        create: {
                            key: item.key,
                            value: item.value,
                        },
                    })
                )
            );
            return results;
        }),

    // Delete setting (reset to default)
    delete: adminProcedure
        .input(settingKeySchema)
        .mutation(async ({ ctx, input }) => {
            try {
                await ctx.prisma.setting.delete({
                    where: { key: input },
                });
                return { success: true };
            } catch (error) {
                // Ignore if not found
                return { success: false };
            }
        }),
});
