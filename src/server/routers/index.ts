import { router } from '../trpc';
import { requestsRouter } from './requests';
import { authRouter } from './auth';
import { settingsRouter } from './settings';

export const appRouter = router({
    requests: requestsRouter,
    auth: authRouter,
    settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
