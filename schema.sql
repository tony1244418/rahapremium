-- =========================================================
-- AUTOMATICALLY GENERATED SUPABASE SCHEMA FOR RAHA PREMIUM
-- Paste this SQL script into the SQL Editor of your NEW Supabase project!
-- =========================================================

-- ---------------------------------------------------------
-- Table: "payments"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."payments" (
  "id" text PRIMARY KEY,
  "user_id" text,
  "package_type" text,
  "game_id" text,
  "content_id" text,
  "amount" numeric,
  "phone_number" text,
  "status" text,
  "order_id" text,
  "zeno_pay_transaction_id" text,
  "ussd_code" text,
  "failure_reason" text,
  "receipt_url" text,
  "created_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "is_manually_completed" boolean,
  "completed_by" text,
  "payment_type" text,
  "content_type" text,
  "content_duration_days" bigint
);

-- ---------------------------------------------------------
-- Table: "rahapremium_users"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."rahapremium_users" (
  "id" text PRIMARY KEY,
  "phone_number" text,
  "display_name" text,
  "username" text,
  "profile_photo_url" text,
  "created_at" timestamp with time zone,
  "last_login_at" timestamp with time zone,
  "is_blocked" boolean,
  "is_adult" boolean,
  "subscription" text,
  "subscription_history" text,
  "payment_history" text,
  "content_accesses" text[],
  "game_accesses" text,
  "email" text,
  "role" text,
  "permissions" text[],
  "current_device_id" text,
  "active_sessions" text,
  "qr_token" text,
  "qr_token_expires_at" timestamp with time zone
);

-- ---------------------------------------------------------
-- Table: "game_accesses"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."game_accesses" (
  "id" text PRIMARY KEY,
  "user_id" text,
  "game_id" text,
  "payment_id" text,
  "start_date" timestamp with time zone,
  "end_date" timestamp with time zone,
  "is_active" boolean,
  "created_at" timestamp with time zone
);

-- ---------------------------------------------------------
-- Table: "stories"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."stories" (
  "id" text PRIMARY KEY,
  "title" text,
  "content" text,
  "author" text,
  "genre" text[],
  "language" text,
  "estimated_read_time" bigint,
  "thumbnail_url" text,
  "required_packages" text[],
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "views" bigint,
  "is_active" boolean,
  "is_adult" boolean,
  "rating" numeric,
  "search_keywords" text[]
);

-- ---------------------------------------------------------
-- Table: "live_channels"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."live_channels" (
  "id" text PRIMARY KEY,
  "name" text,
  "description" text,
  "stream_url" text,
  "stream_format" text,
  "thumbnail_url" text,
  "category" text[],
  "language" text,
  "required_packages" text[],
  "is_active" boolean,
  "is_maintenance" boolean,
  "is_adult" boolean,
  "viewer_count" bigint,
  "total_views" bigint,
  "display_order" bigint,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "search_keywords" text[],
  "encryption_type" text,
  "clear_keys" text,
  "content_purchase_enabled" boolean,
  "content_price" numeric,
  "content_price_days" bigint,
  "content_purchase_packages" text[],
  "video_embed_code" text,
  "external_url" text,
  "sort_order" bigint
);

-- ---------------------------------------------------------
-- Table: "admins"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."admins" (
  "id" text PRIMARY KEY,
  "email" text,
  "display_name" text,
  "role" text,
  "permissions" text[],
  "is_active" boolean,
  "created_at" timestamp with time zone,
  "last_login_at" timestamp with time zone
);

-- ---------------------------------------------------------
-- Table: "feedback"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."feedback" (
  "id" text PRIMARY KEY,
  "user_id" text,
  "user_name" text,
  "user_photo_url" text,
  "content" text,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "likes" text[],
  "loves" text[],
  "replies" text,
  "is_edited" boolean,
  "is_deleted" boolean
);

-- ---------------------------------------------------------
-- Table: "watch_history"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."watch_history" (
  "id" text PRIMARY KEY,
  "user_id" text,
  "movie_id" text,
  "series_id" text,
  "episode_id" text,
  "content_type" text,
  "progress" numeric,
  "duration" bigint,
  "completed" boolean,
  "last_position" bigint,
  "last_watched" timestamp with time zone,
  "season_number" bigint,
  "episode_number" bigint,
  "created_at" timestamp with time zone
);

-- ---------------------------------------------------------
-- Table: "feedbacks"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."feedbacks" (
  "id" text PRIMARY KEY,
  "user_id" text,
  "content" text,
  "likes" text,
  "loves" text,
  "replies" text,
  "is_edited" boolean,
  "is_deleted" boolean,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone
);

-- ---------------------------------------------------------
-- Table: "adult_groups"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."adult_groups" (
  "id" text PRIMARY KEY,
  "label" text,
  "url" text,
  "description" text,
  "icon" text,
  "display_order" bigint,
  "is_active" boolean,
  "required_packages" text[],
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "views" bigint,
  "sort_order" bigint
);

-- ---------------------------------------------------------
-- Table: "admin_settings"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."admin_settings" (
  "id" text PRIMARY KEY,
  "data" text,
  "updated_at" timestamp with time zone,
  "updated_by" text
);

-- ---------------------------------------------------------
-- Table: "games"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."games" (
  "id" text PRIMARY KEY,
  "title" text,
  "description" text,
  "thumbnail_url" text,
  "how_to_set_video_link" text,
  "download_link" text,
  "category" text,
  "platform" text,
  "mode" text,
  "is_free" boolean,
  "required_packages" text[],
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "views" bigint,
  "is_active" boolean,
  "is_adult" boolean,
  "language" text,
  "genre" text[],
  "search_keywords" text[],
  "content_purchase_enabled" boolean,
  "content_price" numeric,
  "content_price_days" bigint,
  "content_purchase_packages" text[],
  "video_embed_code" text
);

-- ---------------------------------------------------------
-- Table: "movies"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."movies" (
  "id" text PRIMARY KEY,
  "title" text,
  "description" text,
  "video_url" text,
  "download_url" text,
  "google_drive_url" text,
  "thumbnail_url" text,
  "duration" bigint,
  "release_date" timestamp with time zone,
  "genre" text[],
  "language" text,
  "quality" text[],
  "required_packages" text[],
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "views" bigint,
  "is_active" boolean,
  "is_adult" boolean,
  "adult_category" text,
  "rating" numeric,
  "cast_list" text[],
  "director" text,
  "search_keywords" text[],
  "content_purchase_enabled" boolean,
  "content_price" numeric,
  "content_price_days" bigint,
  "content_purchase_packages" text[],
  "video_embed_code" text
);

-- ---------------------------------------------------------
-- Table: "series"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."series" (
  "id" text PRIMARY KEY,
  "title" text,
  "description" text,
  "thumbnail_url" text,
  "genre" text[],
  "language" text,
  "total_seasons" bigint,
  "required_packages" text[],
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "views" bigint,
  "is_active" boolean,
  "is_adult" boolean,
  "adult_category" text,
  "rating" numeric,
  "cast_list" text[],
  "search_keywords" text[],
  "content_purchase_enabled" boolean,
  "content_price" numeric,
  "content_price_days" bigint,
  "content_purchase_packages" text[],
  "video_embed_code" text
);

-- ---------------------------------------------------------
-- Table: "episodes"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."episodes" (
  "id" text PRIMARY KEY,
  "series_id" text,
  "season_id" text,
  "episode_number" bigint,
  "title" text,
  "description" text,
  "video_url" text,
  "download_url" text,
  "google_drive_url" text,
  "thumbnail_url" text,
  "duration" bigint,
  "quality" text[],
  "required_packages" text[],
  "is_adult" boolean,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "views" bigint,
  "content_purchase_enabled" boolean,
  "content_price" numeric,
  "content_price_days" bigint,
  "video_embed_code" text
);

-- ---------------------------------------------------------
-- Table: "seasons"
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."seasons" (
  "id" text PRIMARY KEY,
  "series_id" text,
  "season_number" bigint,
  "title" text,
  "description" text,
  "video_url" text,
  "download_url" text,
  "google_drive_url" text,
  "thumbnail_url" text,
  "total_episodes" bigint,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone
);

