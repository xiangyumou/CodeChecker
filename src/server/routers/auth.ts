import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import bcrypt from 'bcrypt';
import { TRPCError } from '@trpc/server';

const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
});

export const authRouter = router({
    // Login
    login: publicProcedure
        .input(loginSchema)
        .mutation(async ({ ctx, input }) => {
            const admin = await ctx.prisma.admin.findUnique({
                where: { username: input.username },
            });

            if (!admin) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'Invalid username or password',
                });
            }

            const isValidPassword = await bcrypt.compare(
                input.password,
                admin.passwordHash
            );

            if (!isValidPassword) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'Invalid username or password',
                });
            }

            // TODO: Generate JWT token or session
            // For now, just return success
            return {
                success: true,
                admin: {
                    id: admin.id,
                    username: admin.username,
                },
            };
        }),

    // Check if system is initialized (has admin user)
    checkInitialized: publicProcedure.query(async ({ ctx }) => {
        const adminCount = await ctx.prisma.admin.count();
        return { initialized: adminCount > 0 };
    }),
});
