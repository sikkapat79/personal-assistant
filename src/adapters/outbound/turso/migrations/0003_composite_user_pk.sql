-- Assign legacy NULL user_ids to placeholder scope before making NOT NULL
UPDATE `snapshot_todos` SET `user_id` = '__unscoped__' WHERE `user_id` IS NULL;
--> statement-breakpoint
UPDATE `snapshot_logs` SET `user_id` = '__unscoped__' WHERE `user_id` IS NULL;
--> statement-breakpoint
UPDATE `entity_id_map` SET `user_id` = '__unscoped__' WHERE `user_id` IS NULL;
--> statement-breakpoint
CREATE TABLE `snapshot_todos_new` (
	`user_id` text NOT NULL,
	`notion_id` text NOT NULL,
	`data` text NOT NULL,
	`fetched_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `notion_id`)
);
--> statement-breakpoint
INSERT INTO `snapshot_todos_new` SELECT `user_id`, `notion_id`, `data`, `fetched_at` FROM `snapshot_todos`;
--> statement-breakpoint
DROP TABLE `snapshot_todos`;
--> statement-breakpoint
ALTER TABLE `snapshot_todos_new` RENAME TO `snapshot_todos`;
--> statement-breakpoint
CREATE TABLE `snapshot_logs_new` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`data` text NOT NULL,
	`fetched_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `date`)
);
--> statement-breakpoint
INSERT INTO `snapshot_logs_new` SELECT `user_id`, `date`, `data`, `fetched_at` FROM `snapshot_logs`;
--> statement-breakpoint
DROP TABLE `snapshot_logs`;
--> statement-breakpoint
ALTER TABLE `snapshot_logs_new` RENAME TO `snapshot_logs`;
--> statement-breakpoint
CREATE TABLE `entity_id_map_new` (
	`user_id` text NOT NULL,
	`local_id` text NOT NULL,
	`notion_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `local_id`)
);
--> statement-breakpoint
INSERT INTO `entity_id_map_new` SELECT `user_id`, `local_id`, `notion_id` FROM `entity_id_map`;
--> statement-breakpoint
DROP TABLE `entity_id_map`;
--> statement-breakpoint
ALTER TABLE `entity_id_map_new` RENAME TO `entity_id_map`;
--> statement-breakpoint
CREATE INDEX `idx_events_user_id` ON `events` (`user_id`);
