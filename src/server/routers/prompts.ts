import { z } from 'zod';
import { router, adminProcedure } from '../trpc';
import { getPromptFromFile } from '@/lib/prompts/loader';

export const promptsRouter = router({
    // Get default content for a prompt (from file)
    getDefault: adminProcedure
        .input(z.object({ name: z.string() }))
        .query(async ({ input }) => {
            return await getPromptFromFile(input.name);
        }),
});
