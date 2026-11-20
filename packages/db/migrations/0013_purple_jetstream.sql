PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_subscription_reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`type` text NOT NULL,
	`period_ends_at` integer NOT NULL,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_subscription_reminders`(`id`, `subscription_id`, `type`, `period_ends_at`, `sent_at`)
SELECT
	r.`id`,
	r.`subscription_id`,
	r.`type`,
	COALESCE(s.`ends_at`, r.`sent_at`),
	r.`sent_at`
FROM `subscription_reminders` r
LEFT JOIN `subscriptions` s ON s.`id` = r.`subscription_id`;--> statement-breakpoint
DROP TABLE `subscription_reminders`;--> statement-breakpoint
ALTER TABLE `__new_subscription_reminders` RENAME TO `subscription_reminders`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_reminders_subscription_type_period_unique` ON `subscription_reminders` (`subscription_id`,`type`,`period_ends_at`);
