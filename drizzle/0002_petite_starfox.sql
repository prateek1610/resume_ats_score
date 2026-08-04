CREATE TABLE `rate_limit_windows` (
	`key` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`window_start` integer NOT NULL,
	`request_count` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limit_windows_updated_idx` ON `rate_limit_windows` (`updated_at`);--> statement-breakpoint
ALTER TABLE `resume_reports` ADD `expires_at` integer;--> statement-breakpoint
CREATE INDEX `resume_reports_expires_idx` ON `resume_reports` (`expires_at`);