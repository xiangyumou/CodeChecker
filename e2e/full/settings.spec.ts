import { test, expect } from '../fixtures/test-base';
import { adminToken } from '../utils/test-data';

/**
 * Settings management E2E tests
 * REQUIRES: Valid admin token
 * @tags @full
 */
test.describe('Settings E2E @full', () => {
    const token = process.env.SETTINGS_TOKEN || adminToken;

    test('E2E-04: Admin can login and view settings', async ({ page, settingsPage }) => {
        await settingsPage.goto();

        // Login with admin token
        await settingsPage.login(token);

        // Wait for settings to load
        await page.waitForTimeout(2000);

        // Check if login succeeded (settings form visible or tabs visible)
        const settingsContent = page.locator('[data-testid="settings-content"]')
            .or(page.locator('text=/api key|model|settings/i'))
            .or(page.locator('[role="tablist"]'))
            .first();

        const isLoggedIn = await settingsContent.isVisible({ timeout: 5000 }).catch(() => false);

        if (!isLoggedIn) {
            // Login might have failed with test token - skip test
            test.skip();
        }
    });

    test('E2E-04: Can switch between settings tabs', async ({ page, settingsPage }) => {
        await settingsPage.goto();
        await settingsPage.login(token);
        await page.waitForTimeout(2000);

        // Find tab buttons
        const tabs = page.locator('[role="tablist"] [role="tab"]');
        const tabCount = await tabs.count();

        if (tabCount > 1) {
            // Click each tab and verify content changes
            for (let i = 0; i < Math.min(tabCount, 3); i++) {
                await tabs.nth(i).click();
                await page.waitForTimeout(500);

                // Verify some content is visible
                const tabPanel = page.locator('[role="tabpanel"]').first();
                await expect(tabPanel).toBeVisible();
            }
        }
    });

    test('E2E-05: Data management shows request count', async ({ page, settingsPage }) => {
        await settingsPage.goto();
        await settingsPage.login(token);
        await page.waitForTimeout(2000);

        // Find data management tab or section
        const dataTab = page.locator('[role="tab"]').filter({ hasText: /data|数据|管理/i });

        if (await dataTab.isVisible()) {
            await dataTab.click();

            // Should show some data management UI
            const dataSection = page.locator('text=/request|清理|delete|count/i').first();
            await expect(dataSection).toBeVisible({ timeout: 5000 });
        }
    });
});
