CREATE TABLE `password_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`paste_id` text NOT NULL,
	`ip` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer
);
