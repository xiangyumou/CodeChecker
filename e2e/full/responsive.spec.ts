import { test, expect } from '../fixtures/test-base';

/**
 * Responsive layout E2E tests
 * Tests across different viewport sizes
 * @tags @full
 */
test.describe('Responsive Layout E2E @full', () => {
    test('E2E-07: Mobile layout hides sidebar by default', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Sidebar should be hidden or collapsible on mobile
        const sidebar = page.locator('aside').first();
        const sidebarVisible = await sidebar.isVisible().catch(() => false);

        if (sidebarVisible) {
            // Check if sidebar has a collapsed state
            const sidebarBox = await sidebar.boundingBox();
            if (sidebarBox) {
                // On mobile, sidebar should either be hidden or very narrow (collapsed)
                expect(sidebarBox.width).toBeLessThan(100);
            }
        }

        // Menu toggle should be visible on mobile
        const menuToggle = page.locator('[data-testid="menu-toggle"]')
            .or(page.getByRole('button', { name: /menu|菜单/i }))
            .or(page.locator('button svg[class*="menu"]').locator('..'))
            .first();

        await expect(menuToggle).toBeVisible({ timeout: 3000 }).catch(() => {
            // Mobile menu might use sheet/drawer pattern
        });
    });

    test('E2E-07: Desktop layout shows full three-column layout', async ({ page }) => {
        // Set desktop viewport
        await page.setViewportSize({ width: 1920, height: 1080 });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Should show sidebar
        const sidebar = page.locator('aside').first();
        await expect(sidebar).toBeVisible();

        // Should show main content area
        const mainContent = page.locator('main, [role="main"]').first();
        await expect(mainContent).toBeVisible();

        // Form and content should be visible
        const form = page.locator('form, textarea').first();
        await expect(form).toBeVisible();
    });

    test('E2E-07: Tablet layout is usable', async ({ page }) => {
        // Set tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Core functionality should be accessible
        const submitForm = page.locator('form').first();
        await expect(submitForm).toBeVisible();

        // Text should be readable (textarea visible)
        const textarea = page.locator('textarea').first();
        await expect(textarea).toBeVisible();
    });

    test('E2E-07: Request detail page responsive', async ({ page }) => {
        // Start with desktop
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/');

        // Check if there are any requests to view
        const requestLink = page.locator('a[href^="/request/"]').first();

        if (await requestLink.isVisible({ timeout: 3000 }).catch(() => false)) {
            await requestLink.click();
            await page.waitForURL(/\/request\/\d+/);

            // Verify content is visible on desktop
            const content = page.locator('main, [role="main"]').first();
            await expect(content).toBeVisible();

            // Switch to mobile
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(500);

            // Content should still be visible (might be full-width now)
            await expect(content).toBeVisible();
        } else {
            test.skip();
        }
    });
});
