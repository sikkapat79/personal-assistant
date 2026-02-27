/**
 * Fetch current data from Notion and sanitize for mock testing
 *
 * Usage: bun run scripts/fetch-mock-data.ts
 *
 * Sanitization rules:
 * - Logs: Replace notes/gratitude, keep title and numeric values
 * - Tasks: Replace titles (preserve length), clear notes, keep metadata
 */

import { NotionLogsAdapter } from '../src/adapters/outbound/notion/logs-adapter';
import { NotionTodosAdapter } from '../src/adapters/outbound/notion/todos-adapter';
import { getNotionClient, buildNotionConfigFromResolved } from '../src/adapters/outbound/notion/client';
import { getResolvedConfig } from '../src/config/resolved';
import { todayLogDate } from '../src/domain/value-objects/log-date';
import type { DailyLog } from '../src/domain/entities/daily-log';
import type { TodoItemDto } from '../src/application/dto/todo-dto';

// Generic placeholder text
const PLACEHOLDER_NOTES = [
  'Slept well, feeling energized and ready to tackle the day.',
  'Good rest, looking forward to productive work.',
  'Decent sleep, moderate energy levels today.',
];

const PLACEHOLDER_GRATITUDE = [
  'Grateful for good health and the opportunity to work on meaningful projects.',
  'Thankful for supportive friends and family.',
  'Appreciating the small wins and progress made today.',
];

const GENERIC_TASKS = [
  'Practice 3-minute summary of work',
  'Review pull request for authentication module',
  'Update documentation for API endpoints',
  'Fix bug in user profile settings',
  'Refactor database query optimization',
  'Write unit tests for new feature',
  'Schedule team meeting for project planning',
  'Research new framework for frontend',
  'Complete code review for backend changes',
  'Deploy staging environment updates',
  'Investigate performance bottleneck in dashboard',
  'Implement error handling for payment flow',
  'Design mockups for mobile app',
  'Optimize images for faster page load',
  'Set up CI/CD pipeline for automated testing',
];

function sanitizeLog(log: DailyLog | null): DailyLog | null {
  if (!log) return null;

  return {
    date: log.date,
    content: {
      ...log.content,
      // Replace notes with placeholder (preserve presence)
      notes: log.content.notes
        ? PLACEHOLDER_NOTES[Math.floor(Math.random() * PLACEHOLDER_NOTES.length)]
        : undefined,
      // Replace gratitude with placeholder (preserve presence)
      gratitude: log.content.gratitude
        ? PLACEHOLDER_GRATITUDE[Math.floor(Math.random() * PLACEHOLDER_GRATITUDE.length)]
        : undefined,
      // Keep title and numeric values as-is (no personal info)
    },
  };
}

function sanitizeTask(task: TodoItemDto, index: number): TodoItemDto {
  // Pick a generic task title that roughly matches the original length
  const originalLength = task.title.length;
  const candidates = GENERIC_TASKS.filter(t => Math.abs(t.length - originalLength) < 20);
  const newTitle = candidates.length > 0
    ? candidates[index % candidates.length]
    : GENERIC_TASKS[index % GENERIC_TASKS.length];

  return {
    ...task,
    title: newTitle,
    notes: null, // Clear notes
    // Keep status, priority, category, dueDate (no personal info)
  };
}

async function fetchAndSanitize() {
  console.log('📥 Fetching current data from Notion...\n');

  const { settings } = getResolvedConfig();
  const config = buildNotionConfigFromResolved(settings);
  const client = getNotionClient(config.apiKey);

  const logsAdapter = new NotionLogsAdapter(
    client,
    config.db.logs.databaseId,
    config.db.logs.columns
  );
  const todosAdapter = new NotionTodosAdapter(
    client,
    config.db.todos.databaseId,
    config.db.todos.columns,
    config.db.todos.doneKind
  );

  // Fetch today's log
  console.log('Fetching today\'s log...');
  const today = todayLogDate();
  const log = await logsAdapter.findByDate(today);
  console.log(`✓ Log fetched: ${log ? log.content.title : '(empty)'}`);

  // Fetch tasks (limit to 15)
  console.log('Fetching open tasks...');
  const allTasks = await todosAdapter.listOpen();
  const tasks = allTasks.slice(0, 15);
  console.log(`✓ Tasks fetched: ${tasks.length} tasks`);

  // Sanitize
  console.log('\n🧹 Sanitizing data...');
  const sanitizedLog = sanitizeLog(log);
  const sanitizedTasks = tasks.map((task, index) => sanitizeTask(task, index));

  // Save to fixture
  const mockData = {
    log: sanitizedLog,
    tasks: sanitizedTasks,
    _metadata: {
      generatedAt: new Date().toISOString(),
      note: 'Sanitized data from Notion for mock testing',
    },
  };

  const outputPath = 'fixtures/mock-data.json';
  await Bun.write(outputPath, JSON.stringify(mockData, null, 2));

  console.log(`\n✅ Mock data saved to ${outputPath}`);
  console.log(`   - Log: ${sanitizedLog ? '1 entry' : '(empty)'}`);
  console.log(`   - Tasks: ${sanitizedTasks.length} entries`);
  console.log('\nSanitization applied:');
  console.log('  - Logs: Notes/gratitude replaced with placeholders');
  console.log('  - Tasks: Titles replaced with generic tasks, notes cleared');
  console.log('  - Numeric values and metadata preserved');
}

// Run
fetchAndSanitize().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
