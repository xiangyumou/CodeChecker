import { Page } from '@playwright/test';

/**
 * API helper functions for E2E tests
 */

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({
        path: `playwright-report/screenshots/${name}-${Date.now()}.png`,
        fullPage: true,
    });
}
