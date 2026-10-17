CREATE TABLE `file_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`storage_key` text NOT NULL,
	`file_name` text NOT NULL,
	`size` integer NOT NULL,
	`password_hash` text,
	`expires_at` integer NOT NULL,
	`downloads_remaining` integer,
	`created_at` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `file_shares_storage_key_unique` ON `file_shares` (`storage_key`);--> statement-breakpoint
CREATE TABLE `new_password_attempts` (
  `id` text PRIMARY KEY NOT NULL,
  `share_id` text NOT NULL,
  `share_kind` text NOT NULL,
  `ip` text NOT NULL,
  `attempts` integer DEFAULT 0 NOT NULL,
  `locked_until` integer
);
--> statement-breakpoint
INSERT INTO `new_password_attempts` SELECT 'text:' || id, paste_id, 'text', ip, attempts, locked_until FROM `password_attempts`;
--> statement-breakpoint
DROP TABLE `password_attempts`;
--> statement-breakpoint
ALTER TABLE `new_password_attempts` RENAME TO `password_attempts`;
