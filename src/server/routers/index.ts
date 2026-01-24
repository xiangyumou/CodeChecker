import { router } from '../trpc';
import { requestsRouter } from './requests';
import { settingsRouter } from './settings';
import { promptsRouter } from './prompts';

export const appRouter = router({
    requests: requestsRouter,
    settings: settingsRouter,
    prompts: promptsRouter,
});

export type AppRouter = typeof appRouter;
