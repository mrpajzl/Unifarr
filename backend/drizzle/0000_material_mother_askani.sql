CREATE TABLE `downloads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`media_item_id` integer,
	`torrent_hash` text,
	`name` text,
	`status` text,
	`progress` real,
	`download_speed` integer,
	`eta` integer,
	`error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`completed_at` text,
	FOREIGN KEY (`media_item_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `downloads_torrent_hash_unique` ON `downloads` (`torrent_hash`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`path` text NOT NULL,
	`filename` text NOT NULL,
	`size` integer,
	`parsed_title` text,
	`parsed_year` integer,
	`parsed_season` integer,
	`parsed_episode` integer,
	`parsed_quality` text,
	`parsed_edition` text,
	`parsed_codec` text,
	`parsed_source` text,
	`media_item_id` integer,
	`matched` integer DEFAULT 0,
	`match_confidence` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`scanned_at` text,
	FOREIGN KEY (`media_item_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `files_path_unique` ON `files` (`path`);--> statement-breakpoint
CREATE TABLE `match_candidates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_id` integer,
	`tmdb_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`poster_path` text,
	`match_score` real,
	`status` text DEFAULT 'pending',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`original_title` text,
	`year` integer,
	`tmdb_id` integer,
	`imdb_id` text,
	`overview` text,
	`poster_path` text,
	`backdrop_path` text,
	`vote_average` real,
	`vote_count` integer,
	`genres` text,
	`runtime` integer,
	`status` text,
	`number_of_seasons` integer,
	`number_of_episodes` integer,
	`monitored` integer DEFAULT 0,
	`library_path` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_tmdb_id_unique` ON `media` (`tmdb_id`);--> statement-breakpoint
CREATE TABLE `media_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`tmdb_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`poster_path` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`user_note` text,
	`admin_note` text,
	`requested_at` text DEFAULT CURRENT_TIMESTAMP,
	`processed_at` text,
	`processed_by` integer,
	`media_item_id` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`media_item_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `providers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`base_url` text NOT NULL,
	`enabled` integer DEFAULT 1,
	`config` text,
	`supported_types` text,
	`priority` integer DEFAULT 50,
	`last_check` text,
	`status` text,
	`error_message` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `searches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`query` text NOT NULL,
	`type` text,
	`provider_id` integer,
	`results_count` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`approved` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);