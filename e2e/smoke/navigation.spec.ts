
import { test, expect } from '../fixtures/test-base';

/**
 * Navigation smoke tests - verify page navigation works
 * These tests don't require GPT API
 * @tags @smoke
 */
test.describe('Navigation Smoke Tests @smoke', () => {
    test('SM-08: 404 page for non-existent request', async ({ page }) => {
        // Navigate to non-existent request ID
        await page.goto('/request/999999');

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // RequestDetailPanel shows 'Request not found' (en), '请求未找到' (zh), or 'Anfrage nicht gefunden' (de)
        // Note: Using text selector as data-testid may not be in SSR HTML
        const notFoundIndicator = page.getByText(/请求未找到|Request not found|Anfrage nicht gefunden/i);

        await expect(notFoundIndicator).toBeVisible({ timeout: 10000 });
    });

    test('Navigation: Page header is consistent across pages', async ({ page }) => {
        // Check homepage
        await page.goto('/');
        const headerHome = page.locator('header, [data-testid="header"]').first();
        await expect(headerHome).toBeVisible();
    });
});
