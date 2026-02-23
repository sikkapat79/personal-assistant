#!/usr/bin/env node
import { compose } from '../../../composition';
import { AGENT_NAME } from '../../../config/branding';
import { todayLogDate } from '../../../domain/value-objects/log-date';
import { runInteractive } from './interactive';
import { createSpinner, say, sayError } from './ui';

async function ping(): Promise<void> {
  try {
    const { getResolvedConfig } = await import('../../../config/resolved');
    const { getNotionClient, validateNotionMapping, buildNotionConfigFromResolved } = await import(
      '../../../adapters/outbound/notion/client'
    );
    const { settings } = getResolvedConfig();
    const config = buildNotionConfigFromResolved(settings);
    const notion = getNotionClient(config.apiKey);
    await validateNotionMapping(config, notion);
    console.log('Logs DB: OK');
    console.log('  columns:', config.db.logs.columns);
    console.log('TODOs DB: OK');
    console.log('  columns:', config.db.todos.columns);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Ping failed:', msg);
    process.exit(1);
  }
}

async function runLog(args: string[]): Promise<void> {
  const dateIdx = args.indexOf('--date');
  const titleIdx = args.indexOf('--title');
  const notesIdx = args.indexOf('--notes');
  const date =
    dateIdx >= 0 && args[dateIdx + 1]
      ? args[dateIdx + 1]
      : todayLogDate();
  const title = titleIdx >= 0 && args[titleIdx + 1] ? args[titleIdx + 1] : '';
  const notes = notesIdx >= 0 && args[notesIdx + 1] ? args[notesIdx + 1] : '';
  const composition = await compose();
  const { logUseCase } = composition;
  const spinner = createSpinner('Saving…');
  spinner.start();
  const result = await logUseCase.upsert({ date, title, notes });
  spinner.succeed(result.created ? 'Created.' : 'Updated.');
}

async function runTodos(args: string[]): Promise<void> {
  const composition = await compose();
  const { todosUseCase } = composition;
  const sub = args[0];
  if (sub === 'list') {
    const all = args.includes('--all');
    const spinner = createSpinner('Loading…');
    spinner.start();
    const list = all ? await todosUseCase.listAll() : await todosUseCase.listOpen();
    spinner.stop();
    list.forEach((t, i) => {
      const due = t.dueDate ? ` (due ${t.dueDate})` : '';
      say(`${i + 1}. [${t.status}] ${t.title}${due}  id=${t.id}`);
    });
    return;
  }
  if (sub === 'add') {
    const title = args.slice(1).find((a) => !a.startsWith('--'));
    const dueIdx = args.indexOf('--due');
    const dueDate = dueIdx >= 0 && args[dueIdx + 1] ? args[dueIdx + 1] : null;
    if (!title) {
      sayError('Usage: journal todos add "Title" [--due YYYY-MM-DD]');
      process.exit(1);
    }
    const spinner = createSpinner('Adding…');
    spinner.start();
    const added = await todosUseCase.add({ title, dueDate });
    spinner.succeed('Added. ' + added.id);
    return;
  }
  if (sub === 'complete') {
    const idOrIndex = args[1];
    if (!idOrIndex) {
      sayError('Usage: journal todos complete <id-or-index>');
      process.exit(1);
    }
    const spinner = createSpinner('Updating…');
    spinner.start();
    await todosUseCase.completeByIdOrIndex(idOrIndex);
    spinner.succeed('Done.');
    return;
  }
  sayError('Usage: journal todos list [--all] | add "..." [--due date] | complete <id>');
  process.exit(1);
}

async function runAgent(): Promise<void> {
  const composition = await compose();
  const { agentUseCase } = composition;
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  say(`Talk to ${AGENT_NAME}. (Set OPENAI_API_KEY in .env to use OpenAI)\n`);
  const history: { role: 'user' | 'assistant'; content: string }[] = [];
  const loop = (): void => {
    rl.question('You: ', async (line) => {
      const input = line?.trim();
      if (!input || input === 'exit' || input === 'quit') {
        rl.close();
        return;
      }
      if (input === '/clear') {
        history.length = 0;
        say('History cleared.\n');
        loop();
        return;
      }
      const spinner = createSpinner('Thinking…');
      spinner.start();
      try {
        const reply = await agentUseCase.chat(input, history);
        spinner.stop();
        history.push({ role: 'user', content: input });
        history.push({ role: 'assistant', content: reply });
        say(`${AGENT_NAME}: ` + reply + '\n');
      } catch (err) {
        spinner.fail('');
        sayError(err instanceof Error ? err.message : String(err));
      }
      loop();
    });
  };
  loop();
}

async function runToday(): Promise<void> {
  const composition = await compose();
  const { logs, todosUseCase } = composition;
  const today = todayLogDate();
  const spinner = createSpinner('Loading…');
  spinner.start();
  const [log, todos] = await Promise.all([
    logs.findByDate(today),
    todosUseCase.listOpen(),
  ]);
  spinner.stop();
  say("Here's your day.\n");
  if (log) say(`Log: ${log.content.title}${log.content.notes ? ` – ${log.content.notes}` : ''}`);
  else say("No log for today yet. How did you sleep? How's your mood after waking up?");
  say('');
  if (todos.length === 0) say('No open TODOs.');
  else todos.forEach((t, i) => say(`${i + 1}. ${t.title}`));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];
  if (cmd === 'ping') {
    await ping();
    return;
  }
  if (cmd === 'log') {
    await runLog(args.slice(1));
    return;
  }
  if (cmd === 'todos') {
    await runTodos(args.slice(1));
    return;
  }
  if (cmd === 'today') {
    await runToday();
    return;
  }
  if (cmd === 'agent' || cmd === 'chat') {
    await runAgent();
    return;
  }
  if (cmd === '--help' || cmd === '-h') {
    say(`journal – self-discipline daily journal (Notion)

Commands:
  journal              Interactive menu (default)
  journal ping         Check Notion connection
  journal log [--date YYYY-MM-DD] [--title "..."] [--notes "..."]
  journal todos list [--all] | add "..." [--due date] | complete <id>
  journal today        Today summary

Config: run TUI to set up (bun run tui) or set in .env / ~/.pa/settings.json`);
    return;
  }
  if (!cmd) {
    await runInteractive();
    return;
  }
  sayError('Unknown command: ' + cmd);
  process.exit(1);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('NOTION_') || msg.includes('Missing')) {
    sayError('Missing or invalid config. Run the TUI to set up: bun run tui. Or set in .env / ~/.pa/settings.json');
  } else {
    sayError(msg);
  }
  process.exit(1);
});