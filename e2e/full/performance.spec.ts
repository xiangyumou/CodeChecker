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

    test('PERF-02: Settings page loads within acceptable time', async ({ page }) => {
        const startTime = Date.now();

        await page.goto('/settings');
        await page.waitForLoadState('networkidle');

        const loadTime = Date.now() - startTime;

        console.log(`Settings page load time: ${loadTime}ms`);
        expect(loadTime).toBeLessThan(5000);
    });

    test('PERF-03: Request list API responds quickly', async ({ page }) => {
        await page.goto('/');

        // Measure API call time
        const apiTiming = await page.evaluate(async () => {
            const start = performance.now();

            await fetch('/api/trpc/requests.list?input=' + encodeURIComponent(JSON.stringify({ take: 20 })));

            return performance.now() - start;
        });

        console.log(`API response time: ${apiTiming}ms`);
        expect(apiTiming).toBeLessThan(2000); // API response < 2s
    });

    test('PERF-04: No memory leaks on navigation', async ({ page }) => {
        // Navigate back and forth multiple times
        for (let i = 0; i < 5; i++) {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            await page.goto('/settings');
            await page.waitForLoadState('networkidle');
        }

        // Get JS heap size (if available)
        const metrics = await page.evaluate(() => {
            if ('memory' in performance) {
                return {
                    usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
                    totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
                };
            }
            return null;
        });

        if (metrics) {
            const usedMB = metrics.usedJSHeapSize / 1024 / 1024;
            console.log(`JS Heap: ${usedMB.toFixed(2)} MB`);

            // Heap should not exceed 100MB for basic navigation
            expect(usedMB).toBeLessThan(100);
        }
    });
});
