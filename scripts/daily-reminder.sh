#!/usr/bin/env sh
# Run from project root: ./scripts/daily-reminder.sh
# Cron example: 0 8 * * * cd /path/to/pa && ./scripts/daily-reminder.sh
cd "$(dirname "$0")/.."
npm run daily
# Optional: show system notification (macOS)
# osascript -e 'display notification "Journal: run journal today" with title "pa"'
