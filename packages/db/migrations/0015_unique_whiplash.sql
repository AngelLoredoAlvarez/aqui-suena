PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_flyers` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`media_id` text,
	`url` text,
	`replaced_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "flyers_media_or_url" CHECK("__new_flyers"."media_id" IS NOT NULL OR "__new_flyers"."url" IS NOT NULL)
);
--> statement-breakpoint
INSERT INTO `__new_flyers`("id", "business_id", "media_id", "url", "replaced_at", "created_at", "updated_at") SELECT "id", "business_id", NULL, "url", "replaced_at", "created_at", "updated_at" FROM `flyers`;--> statement-breakpoint
DROP TABLE `flyers`;--> statement-breakpoint
ALTER TABLE `__new_flyers` RENAME TO `flyers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `flyers_business_id_unique` ON `flyers` (`business_id`);--> statement-breakpoint
CREATE TABLE `__new_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`work_entry_id` text,
	`product_id` text,
	`kind` text NOT NULL,
	`media_id` text,
	`url` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_entry_id`) REFERENCES `work_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "photos_media_or_url" CHECK("__new_photos"."media_id" IS NOT NULL OR "__new_photos"."url" IS NOT NULL)
);
--> statement-breakpoint
INSERT INTO `__new_photos`("id", "business_id", "work_entry_id", "product_id", "kind", "media_id", "url", "created_at") SELECT "id", "business_id", "work_entry_id", "product_id", "kind", NULL, "url", "created_at" FROM `photos`;--> statement-breakpoint
DROP TABLE `photos`;--> statement-breakpoint
ALTER TABLE `__new_photos` RENAME TO `photos`;