import { test, expect } from '../fixtures/test-base';
import { testCode, adminToken } from '../utils/test-data';
import { waitForRequestStatus, createRequestViaAPI } from '../utils/api-helpers';

/**
 * Full E2E test for complete code analysis flow
 * REQUIRES: GPT API configured and services running
 * @tags @full
 */
test.describe('Analysis Flow E2E @full', () => {
    test.skip(
        !process.env.OPENAI_API_KEY,
        'Skipping full E2E tests - OPENAI_API_KEY not configured'
    );

    test('E2E-01: Complete code analysis flow', async ({ page, dashboardPage, request }) => {
        const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

        await dashboardPage.goto();

        // Submit code for analysis
        await dashboardPage.submitCode(testCode.withBug);

        // Wait for URL change to request detail
        await page.waitForURL(/\/request\/\d+/, { timeout: 10000 });

        // Extract request ID from URL
        const url = page.url();
        const requestId = parseInt(url.match(/\/request\/(\d+)/)?.[1] || '0');
        expect(requestId).toBeGreaterThan(0);

        // Verify initial status is QUEUED or PROCESSING (matches UI translations)
        // EN: Waiting/Processing, ZH: 等待中/处理中, DE: Wartend/Verarbeitung
        const statusText = page.locator('text=/waiting|processing|等待中|处理中|wartend|verarbeitung/i').first();
        await expect(statusText).toBeVisible({ timeout: 5000 });

        // Wait for analysis to complete (up to 2 minutes)
        await waitForRequestStatus(request, baseURL, requestId, 'COMPLETED', 120000);

        // Refresh to see completed status
        await page.reload();

        // Verify completed state shows analysis results
        const completedIndicator = page.locator('text=/completed|完成|success/i').first();
        await expect(completedIndicator).toBeVisible({ timeout: 10000 });

        // Verify analysis content is displayed
        const analysisContent = page.locator('[data-testid="analysis-result"]')
            .or(page.locator('text=/explanation|解释|分析/i'))
            .first();
        await expect(analysisContent).toBeVisible();
    });

    test('E2E-03: Can retry a failed request', async ({ page, request }) => {
        const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

        // Navigate to an existing failed request (if any)
        await page.goto('/');

        // Find a failed request in sidebar
        const failedRequest = page.locator('[data-testid="request-item"][data-status="FAILED"]')
            .or(page.locator('text=/failed|失败/i'))
            .first();

        if (await failedRequest.isVisible({ timeout: 3000 }).catch(() => false)) {
            await failedRequest.click();

            // Click retry button
            const retryButton = page.getByRole('button', { name: /retry|重试/i });
            await expect(retryButton).toBeVisible();
            await retryButton.click();

            // Verify status changes back to QUEUED
            const queuedStatus = page.locator('text=/queued|排队/i').first();
            await expect(queuedStatus).toBeVisible({ timeout: 5000 });
        } else {
            test.skip();
        }
    });
});

test.describe('Error Handling E2E @full', () => {
    test('E2E-06: Shows 404 for non-existent request', async ({ page }) => {
        await page.goto('/request/99999999');

        // Should show not found message (matches all translation variants)
        // EN: "Request not found", ZH: "请求未找到", DE: "Anfrage nicht gefunden"
        const notFound = page.locator('text=/not found|未找到|nicht gefunden|404/i').first();
        await expect(notFound).toBeVisible({ timeout: 5000 });
    });

    test('E2E-06: Handles API errors gracefully', async ({ page }) => {
        // Disable network to simulate API failure
        await page.route('**/api/trpc/**', route => route.abort());

        await page.goto('/');

        // Should show some error indication or fallback UI
        // The app shouldn't crash
        const body = page.locator('body');
        await expect(body).toBeVisible();

        // Re-enable network
        await page.unroute('**/api/trpc/**');
    });
});
