import { test, expect } from '../fixtures/test-base';
import { testCode } from '../utils/test-data';

/**
 * Submission smoke tests - verify form submission works
 * These tests verify requests are created but don't wait for GPT analysis
 * @tags @smoke
 */
test.describe('Submission Smoke Tests @smoke', () => {
    test.beforeEach(async ({ dashboardPage }) => {
        await dashboardPage.goto();
    });

    test('SM-02: Can submit code for analysis', async ({ page, dashboardPage }) => {
        // Fill in the code textarea
        await dashboardPage.codeTextarea.fill(testCode.simple);

        // Verify submit button is enabled
        await expect(dashboardPage.submitButton).toBeEnabled();

        // Submit the form
        await dashboardPage.submitButton.click();

        // Wait for request creation indication (pending/processing status)
        // The request should appear in sidebar or we should navigate to detail page
        await page.waitForSelector('text=/queued|排队|处理|pending|processing/i', { timeout: 5000 }).catch(() => {});

        // Check for success indication:
        // 1. Toast notification
        // 2. New request in sidebar
        // 3. URL change to /request/[id]
        const successIndicators = await Promise.race([
            page.waitForURL(/\/request\/\d+/, { timeout: 5000 }).then(() => 'url'),
            page.locator('[data-sonner-toast], [role="alert"]').first().waitFor({ timeout: 5000 }).then(() => 'toast'),
            page.locator('text=/queued|排队|处理/i').first().waitFor({ timeout: 5000 }).then(() => 'status'),
        ]).catch(() => 'none');

        expect(['url', 'toast', 'status']).toContain(successIndicators);
    });

    test('SM-02: Submit button disabled when textarea is empty', async ({ dashboardPage }) => {
        // Clear textarea
        await dashboardPage.codeTextarea.fill('');

        // Submit button should be disabled or form validation should prevent submission
        const isDisabled = await dashboardPage.submitButton.isDisabled();

        if (!isDisabled) {
            // If button is enabled, clicking it should show validation error
            await dashboardPage.submitButton.click();

            // Should not navigate away (still on home page)
            await expect(dashboardPage.submissionForm).toBeVisible();
        }
    });

    test('SM-02: Can clear the form', async ({ page, dashboardPage }) => {
        // Fill in some text
        await dashboardPage.codeTextarea.fill(testCode.simple);

        // Find and click clear button (if exists)
        const clearButton = page.getByRole('button', { name: /clear|清空|löschen/i });

        if (await clearButton.isVisible()) {
            await clearButton.click();

            // Textarea should be empty
            await expect(dashboardPage.codeTextarea).toHaveValue('');
        }
    });

    test('SM-03: Clicking a request in list shows details', async ({ page }) => {
        // First check if there are any existing requests
        const requestItems = page.locator('[data-testid="request-item"]')
            .or(page.locator('aside a[href^="/request/"]'))
            .or(page.locator('[role="listitem"] a'));

        const count = await requestItems.count();

        if (count > 0) {
            // Click the first request
            await requestItems.first().click();

            // Should navigate to request detail page
            await expect(page).toHaveURL(/\/request\/\d+/);

            // Detail panel should show some content
            const detailPanel = page.locator('main, [role="main"], [data-testid="request-detail"]').first();
            await expect(detailPanel).toBeVisible();
        } else {
            // No existing requests - this is acceptable for smoke test
            test.skip();
        }
    });
});
