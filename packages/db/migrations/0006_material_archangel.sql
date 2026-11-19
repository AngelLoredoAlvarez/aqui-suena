CREATE TABLE `payment_events` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_event_id` text NOT NULL,
	`type` text NOT NULL,
	`payment_id` text,
	`payload_hash` text NOT NULL,
	`livemode` integer NOT NULL,
	`processed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_events_provider_event_id_unique` ON `payment_events` (`provider_event_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`subscription_id` text,
	`plan_id` text,
	`billing_interval` text DEFAULT 'monthly' NOT NULL,
	`method` text NOT NULL,
	`provider` text DEFAULT 'conekta' NOT NULL,
	`provider_order_id` text,
	`provider_charge_id` text,
	`idempotency_key` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'MXN' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reference` text,
	`next_action_url` text,
	`expires_at` integer,
	`failure_reason` text,
	`period_start` integer,
	`period_end` integer,
	`paid_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_payments`(
	"id", "account_id", "subscription_id", "plan_id", "billing_interval",
	"method", "provider", "provider_order_id", "provider_charge_id",
	"idempotency_key", "amount", "currency", "status", "reference",
	"next_action_url", "expires_at", "failure_reason", "period_start",
	"period_end", "paid_at", "created_at", "updated_at"
)
SELECT
	p."id",
	(SELECT s."account_id" FROM `subscriptions` s WHERE s."id" = p."subscription_id"),
	p."subscription_id",
	p."plan_id",
	'monthly',
	'card',
	'conekta',
	NULL,
	NULL,
	'legacy-' || p."id",
	p."amount",
	p."currency",
	p."status",
	NULL,
	NULL,
	NULL,
	NULL,
	NULL,
	NULL,
	p."paid_at",
	p."created_at",
	p."updated_at"
FROM `payments` p;--> statement-breakpoint
DROP TABLE `payments`;--> statement-breakpoint
ALTER TABLE `__new_payments` RENAME TO `payments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `payments_provider_order_id_unique` ON `payments` (`provider_order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_idempotency_key_unique` ON `payments` (`idempotency_key`);--> statement-breakpoint
ALTER TABLE `accounts` ADD `conekta_customer_id` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD `default_card_source_id` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD `card_brand` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD `card_last4` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD `card_exp_month` integer;--> statement-breakpoint
ALTER TABLE `accounts` ADD `card_exp_year` integer;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `billing_interval` text DEFAULT 'monthly' NOT NULL;