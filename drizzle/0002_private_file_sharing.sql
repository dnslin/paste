CREATE TABLE `download_grants` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`paste_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`paste_id`) REFERENCES `pastes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `download_grants_paste_expiry_idx` ON `download_grants` (`paste_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `files` (
	`paste_id` text PRIMARY KEY NOT NULL,
	`storage_key` text NOT NULL,
	`file_name` text NOT NULL,
	`size` integer NOT NULL,
	`encryption_version` integer NOT NULL,
	`nonce` text NOT NULL,
	`tag` text NOT NULL,
	`state` text DEFAULT 'ready' NOT NULL,
	FOREIGN KEY (`paste_id`) REFERENCES `pastes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "files_state_check" CHECK("files"."state" IN ('ready', 'deleting')),
	CONSTRAINT "files_size_check" CHECK("files"."size" >= 0 AND "files"."size" <= 10485760)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `files_storage_key_unique` ON `files` (`storage_key`);--> statement-breakpoint
ALTER TABLE `pastes` ADD COLUMN `kind` text DEFAULT 'text' NOT NULL CONSTRAINT `pastes_kind_check` CHECK (`kind` IN ('text', 'file'));
