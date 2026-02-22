import prompts from 'prompts';
import { compose } from '../../../composition';
import { AGENT_NAME } from '../../../config/branding';
import { todayLogDate } from '../../../domain/value-objects/log-date';
import { createSpinner, say, sayDone, sayError } from './ui';

type Choice = 'log' | 'todos-list' | 'todos-add' | 'today' | 'agent' | 'exit';

export async function runInteractive(): Promise<void> {
  say('Self-discipline journal\n');
  const choices: { title: string; value: Choice }[] = [
    { title: 'Log today', value: 'log' },
    { title: 'List TODOs', value: 'todos-list' },
    { title: 'Add TODO', value: 'todos-add' },
    { title: 'Today summary', value: 'today' },
    { title: `Talk to ${AGENT_NAME}`, value: 'agent' },
    { title: 'Exit', value: 'exit' },
  ];

  let exit = false;
  while (!exit) {
    const { action } = await prompts({
      type: 'select',
      name: 'action',
      message: 'What would you like to do?',
      choices,
    });
    if (action === undefined) break;
    if (action === 'exit') {
      exit = true;
      continue;
    }
    say('Got it – opening …\n');
    try {
      await runChoice(action);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      sayError(msg);
    }
    say('');
  }
}

async function runChoice(choice: Choice): Promise<void> {
  const { logUseCase, todosUseCase, logs } = compose();
  const today = todayLogDate();

  switch (choice) {
    case 'log': {
      const { title, notes } = await prompts([
        { type: 'text', name: 'title', message: 'Title for today?' },
        { type: 'text', name: 'notes', message: 'Notes?', initial: '' },
      ]);
      const spinner = createSpinner('Saving…');
      spinner.start();
      const result = await logUseCase.upsert({
        date: today,
        title: title ?? '',
        notes: notes ?? '',
      });
      spinner.succeed(result.created ? 'Created.' : 'Updated.');
      break;
    }
    case 'todos-list': {
      const spinner = createSpinner('Loading…');
      spinner.start();
      const list = await todosUseCase.listOpen();
      spinner.stop();
      if (list.length === 0) say('No open TODOs.');
      else list.forEach((t, i) => say(`${i + 1}. ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ''}`));
      break;
    }
    case 'todos-add': {
      const { title, due } = await prompts([
        { type: 'text', name: 'title', message: 'Task title?' },
        { type: 'text', name: 'due', message: 'Due date (YYYY-MM-DD)?', initial: '' },
      ]);
      if (!title) return;
      const spinner = createSpinner('Adding…');
      spinner.start();
      await todosUseCase.add({ title, dueDate: due || null });
      spinner.succeed('Saved to Notion.');
      break;
    }
    case 'today': {
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
      break;
    }
    case 'agent': {
      const { agentUseCase } = compose();
      const { default: prompts } = await import('prompts');
      say(`${AGENT_NAME} (type "exit" to return to menu)\n`);
      const history: { role: 'user' | 'assistant'; content: string }[] = [];
      while (true) {
        const { input } = await prompts({ type: 'text', name: 'input', message: 'You:' });
        const line = (input as string)?.trim();
        if (!line || line === 'exit') break;
        const spinner = createSpinner('Thinking…');
        spinner.start();
        try {
          const reply = await agentUseCase.chat(line, history);
          spinner.stop();
          history.push({ role: 'user', content: line });
          history.push({ role: 'assistant', content: reply });
          say(`${AGENT_NAME}: ` + reply + '\n');
        } catch (err) {
          spinner.fail('');
          sayError(err instanceof Error ? err.message : String(err));
        }
      }
      break;
    }
    default:
      break;
  }
}
