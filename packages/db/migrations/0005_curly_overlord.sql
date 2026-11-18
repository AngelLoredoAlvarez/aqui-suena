ALTER TABLE `cfdi_invoices` ADD `cancellation_motive` text;--> statement-breakpoint
ALTER TABLE `cfdi_invoices` ADD `cancellation_requested_at` integer;--> statement-breakpoint
ALTER TABLE `cfdi_invoices` ADD `cancellation_resolved_at` integer;--> statement-breakpoint
ALTER TABLE `cfdi_invoices` ADD `cancellation_expires_at` integer;--> statement-breakpoint
ALTER TABLE `cfdi_invoices` ADD `cancellation_detail` text;--> statement-breakpoint
ALTER TABLE `cfdi_invoices` ADD `acuse_key` text;