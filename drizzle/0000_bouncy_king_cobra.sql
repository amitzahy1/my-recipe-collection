CREATE TABLE `shared_collections` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`owner_name` text NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shared_collections_token_unique` ON `shared_collections` (`token`);--> statement-breakpoint
CREATE TABLE `recipe_ratings` (
	`user_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`score` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `owner_id`, `recipe_id`)
);
--> statement-breakpoint
CREATE TABLE `shared_recipes` (
	`collection_id` text NOT NULL,
	`id` text NOT NULL,
	`recipe_json` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`collection_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`user_id` text NOT NULL,
	`collection_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `collection_id`)
);
