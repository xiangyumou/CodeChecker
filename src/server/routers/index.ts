import { router } from '../trpc';
import { requestsRouter } from './requests';
import { authRouter } from './auth';
import { settingsRouter } from './settings';
import { promptsRouter } from './prompts';

export const appRouter = router({
    requests: requestsRouter,
    auth: authRouter,
    settings: settingsRouter,
    prompts: promptsRouter,
});

export type AppRouter = typeof appRouter;
