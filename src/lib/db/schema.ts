import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const requests = sqliteTable('requests', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    status: text('status').default('QUEUED').notNull(), // QUEUED, PROCESSING, COMPLETED, FAILED
    userPrompt: text('user_prompt'),
    imageReferences: text('image_references', { mode: 'json' }),

    // Multi-stage pipeline fields
    problemDetails: text('problem_details', { mode: 'json' }),
    formattedCode: text('formatted_code'),
    analysisResult: text('analysis_result', { mode: 'json' }),

    // Pipeline stage tracking
    stage1Status: text('stage1_status').default('pending'),
    stage2Status: text('stage2_status').default('pending'),
    stage3Status: text('stage3_status').default('pending'),
    stage1CompletedAt: integer('stage1_completed_at', { mode: 'timestamp' }),
    stage2CompletedAt: integer('stage2_completed_at', { mode: 'timestamp' }),
    stage3CompletedAt: integer('stage3_completed_at', { mode: 'timestamp' }),

    gptRawResponse: text('gpt_raw_response', { mode: 'json' }),
    errorMessage: text('error_message'),
    isSuccess: integer('is_success', { mode: 'boolean' }).default(false).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const settings = sqliteTable('settings', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    key: text('key').unique().notNull(),
    value: text('value').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Types for TypeScript
export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
