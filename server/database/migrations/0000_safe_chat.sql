CREATE TABLE `api_usage_log` (
	`date` text PRIMARY KEY NOT NULL,
	`calls_made` integer DEFAULT 0 NOT NULL,
	`daily_limit` integer DEFAULT 5000 NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_log` (
	`id` text PRIMARY KEY NOT NULL,
	`query_id` text NOT NULL,
	`channel` text NOT NULL,
	`new_items_count` integer DEFAULT 0 NOT NULL,
	`price_drops_count` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`error_message` text,
	`sent_at` text NOT NULL,
	FOREIGN KEY (`query_id`) REFERENCES `tracked_queries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_notif_query` ON `notification_log` (`query_id`,`sent_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`is_secret` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tracked_items` (
	`id` text PRIMARY KEY NOT NULL,
	`query_id` text NOT NULL,
	`ebay_item_id` text NOT NULL,
	`title` text NOT NULL,
	`item_url` text NOT NULL,
	`image_url` text,
	`buying_option` text NOT NULL,
	`first_seen_price` real NOT NULL,
	`current_price` real NOT NULL,
	`first_seen_shipping` real DEFAULT 0 NOT NULL,
	`current_shipping` real DEFAULT 0 NOT NULL,
	`first_seen_total_cost` real NOT NULL,
	`current_total_cost` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`item_status` text DEFAULT 'active' NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`out_of_view_since` text,
	`ended_at` text,
	`notified_new` integer DEFAULT false NOT NULL,
	`last_notified_price` real,
	FOREIGN KEY (`query_id`) REFERENCES `tracked_queries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_items_query_status` ON `tracked_items` (`query_id`,`item_status`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_items_query_ebay` ON `tracked_items` (`query_id`,`ebay_item_id`);--> statement-breakpoint
CREATE INDEX `idx_items_out_of_view` ON `tracked_items` (`item_status`,`out_of_view_since`);--> statement-breakpoint
CREATE INDEX `idx_items_ended` ON `tracked_items` (`item_status`,`ended_at`);--> statement-breakpoint
CREATE TABLE `tracked_queries` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text,
	`raw_url` text NOT NULL,
	`parsed_params` text NOT NULL,
	`polling_interval` text NOT NULL,
	`track_prices` integer DEFAULT true NOT NULL,
	`notify_channel` text DEFAULT 'both' NOT NULL,
	`is_paused` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_error` text,
	`last_polled_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_queries_status` ON `tracked_queries` (`status`);--> statement-breakpoint
CREATE INDEX `idx_queries_next_poll` ON `tracked_queries` (`is_paused`,`last_polled_at`);