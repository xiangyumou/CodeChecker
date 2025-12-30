import { Client } from '@upstash/qstash';

// Create QStash client for sending tasks
export const qstash = new Client({
    token: process.env.QSTASH_TOKEN!,
});

// Get the base URL for webhook callbacks
export function getWebhookUrl(path: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}${path}`;
}
