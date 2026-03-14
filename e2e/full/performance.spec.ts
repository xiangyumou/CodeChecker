import { test, expect } from '@playwright/test';

/**
 * Basic performance tests using Playwright
 * For comprehensive stress testing, use dedicated tools like k6
 * @tags @full @performance
 */
test.describe('Performance Tests @full', () => {
    test('PERF-01: Homepage loads within acceptable time', async ({ page }) => {
        const startTime = Date.now();

        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        const domContentLoaded = Date.now() - startTime;

        await page.waitForLoadState('networkidle');
        const fullyLoaded = Date.now() - startTime;

        console.log(`DOM Content Loaded: ${domContentLoaded}ms`);
        console.log(`Fully Loaded: ${fullyLoaded}ms`);

        // Performance thresholds
        expect(domContentLoaded).toBeLessThan(3000); // DOM ready < 3s
        expect(fullyLoaded).toBeLessThan(10000); // Full load < 10s
    });
});
