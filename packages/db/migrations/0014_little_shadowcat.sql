ALTER TABLE `media` ADD `business_id` text REFERENCES businesses(id);--> statement-breakpoint
CREATE UNIQUE INDEX `media_r2_key_unique` ON `media` (`r2_key`);