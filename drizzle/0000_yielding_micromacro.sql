CREATE TABLE `pastes` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`language` text DEFAULT 'plaintext',
	`password_hash` text,
	`expires_at` integer,
	`burn_count` integer,
	`created_at` integer NOT NULL,
	`iv` text,
	`encrypted` integer DEFAULT false
);
