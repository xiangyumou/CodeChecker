ALTER TABLE `requests` DROP COLUMN `stage1_status`;--> statement-breakpoint
ALTER TABLE `requests` DROP COLUMN `stage2_status`;--> statement-breakpoint
ALTER TABLE `requests` DROP COLUMN `stage3_status`;--> statement-breakpoint
ALTER TABLE `requests` DROP COLUMN `stage1_completed_at`;--> statement-breakpoint
ALTER TABLE `requests` DROP COLUMN `stage2_completed_at`;--> statement-breakpoint
ALTER TABLE `requests` DROP COLUMN `stage3_completed_at`;