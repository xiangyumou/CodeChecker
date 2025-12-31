import { Page, APIRequestContext } from '@playwright/test';

/**
 * API helper functions for E2E tests
 */

interface CreateRequestInput {
    userPrompt?: string;
    imageReferences?: string[];
}

interface RequestResponse {
    id: number;
    status: string;
    userPrompt?: string;
    createdAt: string;
}

/**
 * Create a request via tRPC API
 */
export async function createRequestViaAPI(
    request: APIRequestContext,
    baseURL: string,
    input: CreateRequestInput
): Promise<RequestResponse> {
    const response = await request.post(`${baseURL}/api/trpc/requests.create`, {
        headers: {
            'Content-Type': 'application/json',
        },
        data: {
            json: input,
        },
    });

    const json = await response.json();
    return json.result.data.json;
}

/**
 * Get request by ID via tRPC API
 */
export async function getRequestViaAPI(
    request: APIRequestContext,
    baseURL: string,
    id: number
): Promise<RequestResponse | null> {
    const response = await request.get(
        `${baseURL}/api/trpc/requests.getById?input=${encodeURIComponent(JSON.stringify(id))}`
    );

    if (!response.ok()) {
        return null;
    }

    const json = await response.json();
    return json.result.data.json;
}

/**
 * Wait for request to reach a specific status
 */
export async function waitForRequestStatus(
    request: APIRequestContext,
    baseURL: string,
    id: number,
    expectedStatus: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
    timeoutMs = 60000
): Promise<RequestResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        const req = await getRequestViaAPI(request, baseURL, id);

        if (req && req.status === expectedStatus) {
            return req;
        }

        // Wait 1 second before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Request ${id} did not reach status ${expectedStatus} within ${timeoutMs}ms`);
}

/**
 * Clear all requests via API (requires admin token)
 */
export async function clearAllRequestsViaAPI(
    request: APIRequestContext,
    baseURL: string,
    adminToken: string
): Promise<void> {
    await request.post(`${baseURL}/api/trpc/requests.clearAll`, {
        headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken,
        },
        data: {
            json: {},
        },
    });
}

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
