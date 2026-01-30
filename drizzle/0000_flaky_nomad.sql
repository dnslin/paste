CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`paste_id` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`storage_path` text NOT NULL,
	`sha256` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`paste_id`) REFERENCES `pastes`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attachments_paste_id_idx` ON `attachments` (`paste_id`);--> statement-breakpoint
CREATE INDEX `attachments_created_at_idx` ON `attachments` (`created_at`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`ip` text,
	`user_agent` text,
	`target_type` text,
	`target_id` text,
	`metadata_json` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_event_type_idx` ON `audit_logs` (`event_type`);--> statement-breakpoint
CREATE INDEX `audit_logs_target_type_idx` ON `audit_logs` (`target_type`);--> statement-breakpoint
CREATE TABLE `pastes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_type` text NOT NULL,
	`owner_key_hash` text,
	`title` text,
	`content_type` text NOT NULL,
	`content_ciphertext` blob NOT NULL,
	`content_iv` blob NOT NULL,
	`content_tag` blob NOT NULL,
	`content_size` integer NOT NULL,
	`language` text,
	`tags_json` text,
	`is_pinned` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `pastes_owner_type_idx` ON `pastes` (`owner_type`);--> statement-breakpoint
CREATE INDEX `pastes_owner_key_hash_idx` ON `pastes` (`owner_key_hash`);--> statement-breakpoint
CREATE INDEX `pastes_created_at_idx` ON `pastes` (`created_at`);--> statement-breakpoint
CREATE INDEX `pastes_expires_at_idx` ON `pastes` (`expires_at`);--> statement-breakpoint
CREATE INDEX `pastes_is_pinned_idx` ON `pastes` (`is_pinned`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer NOT NULL,
	`last_seen_at` integer,
	`ip` text,
	`user_agent` text
);
--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shares` (
	`id` text PRIMARY KEY NOT NULL,
	`paste_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`password_hash` text,
	`one_time` integer DEFAULT false NOT NULL,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_access_at` integer,
	`revoked_at` integer,
	FOREIGN KEY (`paste_id`) REFERENCES `pastes`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shares_token_hash_uniq` ON `shares` (`token_hash`);--> statement-breakpoint
CREATE INDEX `shares_paste_id_idx` ON `shares` (`paste_id`);--> statement-breakpoint
CREATE INDEX `shares_expires_at_idx` ON `shares` (`expires_at`);--> statement-breakpoint
CREATE INDEX `shares_one_time_idx` ON `shares` (`one_time`);--> statement-breakpoint
CREATE INDEX `shares_revoked_at_idx` ON `shares` (`revoked_at`);