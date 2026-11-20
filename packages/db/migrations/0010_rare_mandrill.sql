CREATE TABLE `account_preferences` (
	`account_id` text PRIMARY KEY NOT NULL,
	`locale` text DEFAULT 'es-MX' NOT NULL,
	`renewal_reminders_enabled` integer DEFAULT true NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `account_preferences` (`account_id`, `locale`, `renewal_reminders_enabled`, `updated_at`)
SELECT `id`, `locale`, `renewal_reminders_enabled`, `updated_at` FROM `accounts`;
--> statement-breakpoint
ALTER TABLE `accounts` DROP COLUMN `locale`;--> statement-breakpoint
ALTER TABLE `accounts` DROP COLUMN `renewal_reminders_enabled`;