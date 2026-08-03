CREATE TABLE `resume_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`filename` text NOT NULL,
	`storage_key` text,
	`content_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`mode` text NOT NULL,
	`job_description` text,
	`overall_score` integer NOT NULL,
	`keyword_score` integer NOT NULL,
	`structure_score` integer NOT NULL,
	`impact_score` integer NOT NULL,
	`essentials_score` integer NOT NULL,
	`matched_keywords` text NOT NULL,
	`missing_keywords` text NOT NULL,
	`strengths` text NOT NULL,
	`recommendations` text NOT NULL,
	`sections` text NOT NULL,
	`stats` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `resume_reports_owner_created_idx` ON `resume_reports` (`owner_email`,`created_at`);