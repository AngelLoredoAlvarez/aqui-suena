CREATE INDEX `businesses_account_idx` ON `businesses` (`account_id`);--> statement-breakpoint
CREATE INDEX `cfdi_invoices_status_updated_idx` ON `cfdi_invoices` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `payments_status_created_idx` ON `payments` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `payments_subscription_created_idx` ON `payments` (`subscription_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_ends_idx` ON `subscriptions` (`status`,`ends_at`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_grace_idx` ON `subscriptions` (`status`,`grace_end`);--> statement-breakpoint
CREATE INDEX `subscriptions_account_status_idx` ON `subscriptions` (`account_id`,`status`);