import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authRouter } from '../auth';
import bcrypt from 'bcrypt';

// Mock bcrypt
vi.mock('bcrypt', () => ({
    default: {
        compare: vi.fn()
    }
}));

// Mock Prisma
const mockPrisma = {
    admin: {
        findUnique: vi.fn(),
        count: vi.fn(),
    }
};

describe('authRouter', () => {
    const caller = authRouter.createCaller({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        prisma: mockPrisma as unknown as any,
        headers: new Headers(),
    });

    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('login', () => {
        it('should login successfully with correct credentials', async () => {
            const mockAdmin = { id: 1, username: 'admin', passwordHash: 'hashed' };
            mockPrisma.admin.findUnique.mockResolvedValue(mockAdmin);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (bcrypt.compare as unknown as any).mockResolvedValue(true);

            const result = await caller.login({ username: 'admin', password: 'password' });

            expect(mockPrisma.admin.findUnique).toHaveBeenCalledWith({ where: { username: 'admin' } });
            expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashed');
            expect(result).toEqual({
                success: true,
                admin: { id: 1, username: 'admin' }
            });
        });

        it('should fail with invalid username', async () => {
            mockPrisma.admin.findUnique.mockResolvedValue(null);

            await expect(caller.login({ username: 'wrong', password: 'password' }))
                .rejects.toThrow('Invalid username or password');
        });

        it('should fail with invalid password', async () => {
            const mockAdmin = { id: 1, username: 'admin', passwordHash: 'hashed' };
            mockPrisma.admin.findUnique.mockResolvedValue(mockAdmin);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (bcrypt.compare as unknown as any).mockResolvedValue(false);

            await expect(caller.login({ username: 'admin', password: 'wrong' }))
                .rejects.toThrow('Invalid username or password');
        });
    });

    describe('checkInitialized', () => {
        it('should return true if admins exist', async () => {
            mockPrisma.admin.count.mockResolvedValue(1);
            const result = await caller.checkInitialized();
            expect(result).toEqual({ initialized: true });
        });

        it('should return false if no admins exist', async () => {
            mockPrisma.admin.count.mockResolvedValue(0);
            const result = await caller.checkInitialized();
            expect(result).toEqual({ initialized: false });
        });
    });
});
