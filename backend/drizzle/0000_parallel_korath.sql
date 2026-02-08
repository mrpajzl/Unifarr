CREATE TABLE "downloads" (
	"id" serial PRIMARY KEY NOT NULL,
	"media_item_id" integer,
	"torrent_hash" text,
	"name" text,
	"status" text,
	"progress" real,
	"download_speed" integer,
	"eta" integer,
	"error" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	CONSTRAINT "downloads_torrent_hash_unique" UNIQUE("torrent_hash")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"filename" text NOT NULL,
	"size" integer,
	"parsed_title" text,
	"parsed_year" integer,
	"parsed_season" integer,
	"parsed_episode" integer,
	"parsed_quality" text,
	"parsed_edition" text,
	"parsed_codec" text,
	"parsed_source" text,
	"media_item_id" integer,
	"matched" boolean DEFAULT false,
	"match_confidence" real,
	"created_at" timestamp DEFAULT now(),
	"scanned_at" timestamp,
	CONSTRAINT "files_path_unique" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "match_candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_id" integer,
	"tmdb_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"year" integer,
	"poster_path" text,
	"match_score" real,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"original_title" text,
	"year" integer,
	"tmdb_id" integer,
	"imdb_id" text,
	"overview" text,
	"poster_path" text,
	"backdrop_path" text,
	"vote_average" real,
	"vote_count" integer,
	"genres" text,
	"runtime" integer,
	"status" text,
	"number_of_seasons" integer,
	"number_of_episodes" integer,
	"monitored" boolean DEFAULT false,
	"library_path" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "media_tmdb_id_unique" UNIQUE("tmdb_id")
);
--> statement-breakpoint
CREATE TABLE "media_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tmdb_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"year" integer,
	"poster_path" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"user_note" text,
	"admin_note" text,
	"requested_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	"processed_by" integer,
	"media_item_id" integer
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"base_url" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"config" text,
	"supported_types" text,
	"priority" integer DEFAULT 50,
	"last_check" timestamp,
	"status" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "searches" (
	"id" serial PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"type" text,
	"provider_id" integer,
	"results_count" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_media_item_id_media_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_media_item_id_media_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_requests" ADD CONSTRAINT "media_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_requests" ADD CONSTRAINT "media_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_requests" ADD CONSTRAINT "media_requests_media_item_id_media_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "searches" ADD CONSTRAINT "searches_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;