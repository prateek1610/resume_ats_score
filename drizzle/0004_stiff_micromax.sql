CREATE TABLE `analytics_daily` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`event` text NOT NULL,
	`dimension` text NOT NULL,
	`event_count` integer NOT NULL,
	`total_value` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analytics_daily_day_idx` ON `analytics_daily` (`day`);--> statement-breakpoint
CREATE INDEX `analytics_daily_event_day_idx` ON `analytics_daily` (`event`,`day`);