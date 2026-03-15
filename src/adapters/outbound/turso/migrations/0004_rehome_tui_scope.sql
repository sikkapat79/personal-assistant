-- Re-home pre-auth TUI rows: snapshots went to __unscoped__, events stayed NULL
UPDATE `events` SET `user_id` = '__tui__' WHERE `user_id` IS NULL;
--> statement-breakpoint
UPDATE `snapshot_todos` SET `user_id` = '__tui__' WHERE `user_id` = '__unscoped__';
--> statement-breakpoint
UPDATE `snapshot_logs` SET `user_id` = '__tui__' WHERE `user_id` = '__unscoped__';
--> statement-breakpoint
UPDATE `entity_id_map` SET `user_id` = '__tui__' WHERE `user_id` = '__unscoped__';
