CREATE TABLE `entity_id_map` (
	`local_id` text PRIMARY KEY NOT NULL,
	`notion_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload` text NOT NULL,
	`timestamp` text NOT NULL,
	`device_id` text NOT NULL,
	`synced` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_unsynced` ON `events` (`synced`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_events_type_timestamp` ON `events` (`event_type`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_events_entity_id_id` ON `events` (`entity_id`,`id`);--> statement-breakpoint
CREATE TABLE `snapshot_logs` (
	`date` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `snapshot_todos` (
	`notion_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`fetched_at` text NOT NULL
);
