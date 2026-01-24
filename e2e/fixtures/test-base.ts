/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, Page } from '@playwright/test';

/**
 * Page Object Model for the Dashboard/Home page
 */
export class DashboardPage {
    constructor(private page: Page) { }

    async goto() {
        // Use domcontentloaded for faster detection, avoiding timeout on slow dev server
        await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    }

    // Locators
    get submissionForm() {
        return this.page.locator('[data-testid="submission-form"], form').first();
    }

    get codeTextarea() {
        return this.page.locator('[data-testid="submission-prompt"]').or(this.page.locator('textarea')).first();
    }

    get submitButton() {
        // Button text from translations: "Analyze" (en), "分析" (zh), "Analysieren" (de)
        return this.page.locator('[data-testid="submission-submit"]').or(
            this.page.getByRole('button', { name: /analyze|分析|analysieren|submit|提交|senden/i })
        ).first();
    }

    get requestList() {
        return this.page.locator('[data-testid="request-list"]').or(
            this.page.locator('aside, [role="navigation"]').first()
        );
    }

    get themeSwitcher() {
        return this.page.locator('[data-testid="theme-switcher"]').or(
            this.page.getByRole('button', { name: /theme|主题|dark|light/i })
        );
    }

    get languageSwitcher() {
        return this.page.locator('[data-testid="language-switcher"]').or(
            this.page.getByRole('button', { name: /en|zh|de|language|语言/i })
        );
    }

    // Actions
    async submitCode(code: string) {
        // Click textarea to focus it first
        await this.codeTextarea.click();
        // Select all and delete to clear any existing content
        await this.codeTextarea.fill('');
        // Fill with code
        await this.codeTextarea.fill(code);
        // Wait for button to become enabled (React state update)
        await expect(this.submitButton).toBeEnabled({ timeout: 5000 });
        await this.submitButton.click();
    }

    async waitForRequestInList(timeout = 5000) {
        await this.page.waitForSelector('[data-testid="request-item"], [role="listitem"]', {
            timeout,
        });
    }
}

/**
 * Page Object Model for the Settings page
 */
export class SettingsPage {
    constructor(private page: Page) { }

    async goto() {
        await this.page.goto('/settings', { waitUntil: 'domcontentloaded' });
    }

    get loginForm() {
        return this.page.locator('form').first();
    }

    get tokenInput() {
        return this.page.locator('input[type="password"], input[type="text"]').first();
    }

    get loginButton() {
        return this.page.getByRole('button', { name: /access settings|login|登录|anmelden/i });
    }

    async login(token: string) {
        await this.tokenInput.fill(token);
        await this.loginButton.click();
    }
}

/**
 * Page Object Model for Request Detail panel
 */
export class RequestDetailPanel {
    constructor(private page: Page) { }

    get container() {
        return this.page.locator('[data-testid="request-detail"], main, [role="main"]').first();
    }

    get status() {
        return this.page.locator('[data-testid="request-status-badge"]').or(
            this.page.locator('text=/queued|processing|completed|failed|排队|处理|完成|失败|waiting|waiting|阶段|stage|stufe/i').first()
        );
    }

    get pipelineStatus() {
        return this.page.locator('[data-testid="pipeline-status"]');
    }

    get retryButton() {
        return this.page.getByRole('button', { name: /retry|重试|wiederholen/i });
    }

    async waitForStatus(status: 'queued' | 'processing' | 'completed' | 'failed', timeout = 60000) {
        if (status === 'processing') {
            // Processing status might show as "Stage X/3" or localized versions
            await expect(this.page.locator('text=/processing|处理中|in bearbeitung|stage|阶段|stufe/i').first()).toBeVisible({ timeout });
        } else if (status === 'queued') {
            await expect(this.page.locator('text=/queued|waiting|等待中|wartend/i').first()).toBeVisible({ timeout });
        } else {
            await expect(this.page.locator(`text=/${status}/i`).first()).toBeVisible({ timeout });
        }
    }
}

/**
 * Extended test fixture with page objects
 */
export const test = base.extend<{
    dashboardPage: DashboardPage;
    settingsPage: SettingsPage;
    requestDetailPanel: RequestDetailPanel;
}>({
    dashboardPage: async ({ page }, use) => {
        await use(new DashboardPage(page));
    },
    settingsPage: async ({ page }, use) => {
        await use(new SettingsPage(page));
    },
    requestDetailPanel: async ({ page }, use) => {
        await use(new RequestDetailPanel(page));
    },
});

export { expect };
