DROP INDEX `idx_events_unsynced`;--> statement-breakpoint
CREATE INDEX `idx_events_entity_id_id` ON `events` (`entity_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_events_unsynced` ON `events` (`synced`,`id`);