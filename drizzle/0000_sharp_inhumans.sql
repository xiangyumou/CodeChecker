CREATE TABLE `requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text DEFAULT 'QUEUED' NOT NULL,
	`user_prompt` text,
	`image_references` text,
	`problem_details` text,
	`formatted_code` text,
	`analysis_result` text,
	`stage1_status` text DEFAULT 'pending',
	`stage2_status` text DEFAULT 'pending',
	`stage3_status` text DEFAULT 'pending',
	`stage1_completed_at` integer,
	`stage2_completed_at` integer,
	`stage3_completed_at` integer,
	`gpt_raw_response` text,
	`error_message` text,
	`is_success` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);