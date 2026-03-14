import { test, expect } from '../fixtures/test-base';

/**
 * Homepage smoke tests - verify core UI elements load correctly
 * These tests don't require GPT API
 * @tags @smoke
 */
test.describe('Homepage Smoke Tests @smoke', () => {
    test.beforeEach(async ({ dashboardPage }) => {
        await dashboardPage.goto();
    });

    test('SM-01: Dashboard loads successfully', async ({ page, dashboardPage }) => {
        // Verify page title
        await expect(page).toHaveTitle(/CodeChecker|Code Checker/i);

        // Verify main elements are visible
        await expect(dashboardPage.submissionForm).toBeVisible();
        await expect(dashboardPage.codeTextarea).toBeVisible();
        await expect(dashboardPage.submitButton).toBeVisible();
    });

    test('SM-02: Request list sidebar is visible', async ({ page }) => {
        // Sidebar should be visible on desktop
        const sidebar = page.locator('aside').or(page.locator('[data-testid="sidebar"]')).first();
        await expect(sidebar).toBeVisible();
    });


    test('SM-06: No console errors on page load', async ({ page }) => {
        const errors: string[] = [];

        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Filter out known non-critical errors (e.g., favicon, analytics)
        const criticalErrors = errors.filter(err =>
            !err.includes('favicon') &&
            !err.includes('analytics') &&
            !err.includes('hydration')
        );

        expect(criticalErrors).toHaveLength(0);
    });
});
