/**
 * TUI Render Test - Simulate text wrapping and truncation logic
 * Usage: bun run test-tui-render.tsx
 */

import { wrapText, truncateText } from './src/adapters/inbound/cli/tui/wrapText';
import type { TodoItemDto } from './src/application/dto/todo-dto';

// Sample tasks
const sampleTasks: TodoItemDto[] = [
  {
    id: '1',
    title: 'Practice 3-minute summary of work',
    status: 'In Progress',
    priority: 'High',
    category: 'Work',
    dueDate: null,
    notes: null,
  },
  {
    id: '2',
    title: 'Review pull request for authentication module',
    status: 'Todo',
    priority: 'Medium',
    category: 'Work',
    dueDate: null,
    notes: null,
  },
];

// Simulate Tasks rendering logic
function simulateTasksRendering(tasks: TodoItemDto[], contentWidth: number) {
  console.log(`\n${'='.repeat(contentWidth + 6)}`);
  console.log(`Tasks Section (contentWidth: ${contentWidth})`);
  console.log('='.repeat(contentWidth + 6));

  for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
    const task = tasks[taskIndex];
    const statusIcon = task.status === 'In Progress' ? '▶' : '○';
    const prefix = `${taskIndex + 1}. ${statusIcon} `;
    const suffix = task.priority ? ` (${task.priority})` : '';
    const taskText = task.title + suffix;

    // Current logic: truncate only (no wrapping)
    const finalText = truncateText(prefix + taskText, contentWidth);

    console.log(`  Prefix: "${prefix}" (${prefix.length} chars)`);
    console.log(`  Task: "${taskText}"`);
    console.log(`  Final: "${finalText}" (${finalText.length} chars)`);
    console.log(`  Max: ${contentWidth} chars`);
    console.log('');
  }
}

// Simulate Chat rendering logic
function simulateChatRendering(messages: Array<{ role: 'user' | 'assistant'; content: string }>, contentWidth: number) {
  console.log(`\n${'='.repeat(contentWidth + 6)}`);
  console.log(`Chat Section (contentWidth: ${contentWidth})`);
  console.log('='.repeat(contentWidth + 6));

  for (const msg of messages) {
    const rolePrefix = msg.role === 'user' ? 'You: ' : 'Pax: ';
    const indent = '     '; // 5 spaces
    const wrappedLines = wrapText(msg.content, contentWidth - rolePrefix.length);

    console.log(`  Role: ${msg.role}`);
    console.log(`  Prefix: "${rolePrefix}" (${rolePrefix.length} chars)`);
    console.log(`  Content: "${msg.content}"`);
    console.log(`  Wrapped into ${wrappedLines.length} lines:`);

    for (let i = 0; i < wrappedLines.length; i++) {
      const lineText = i === 0
        ? rolePrefix + wrappedLines[i]
        : indent + wrappedLines[i];
      const finalText = truncateText(lineText, contentWidth);

      console.log(`    Line ${i + 1}: "${finalText}" (${finalText.length}/${contentWidth} chars)`);
    }
    console.log('');
  }
}

// Run simulations
console.log('\n📊 TUI Text Rendering Simulation\n');

// Test Tasks at different widths
console.log('\n🔹 TASKS SECTION TESTS');
[24, 30, 40].forEach(contentWidth => {
  simulateTasksRendering(sampleTasks, contentWidth);
});

// Test Chat at different widths
console.log('\n\n🔹 CHAT SECTION TESTS');
const sampleChat = [
  { role: 'user' as const, content: 'How did I sleep?' },
  {
    role: 'assistant' as const,
    content: 'This is a longer message that will definitely wrap to multiple lines when the content width is narrow.',
  },
];

[30, 40, 60].forEach(contentWidth => {
  simulateChatRendering(sampleChat, contentWidth);
});

console.log('\n✅ Simulation complete\n');
