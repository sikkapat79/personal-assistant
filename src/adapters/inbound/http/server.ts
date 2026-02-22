/**
 * Optional minimal local HTTP UI (Phase 7).
 * Same use cases as CLI; run: bun run ui → http://localhost:3000
 */
import express from 'express';
import { compose } from '../../../composition';
import { todayLogDate } from '../../../domain/value-objects/LogDate';

const app = express();
app.use(express.json());

app.get('/today', async (_req, res) => {
  try {
    const { logs, todosUseCase } = compose();
    const today = todayLogDate();
    const [log, todos] = await Promise.all([
      logs.findByDate(today),
      todosUseCase.listOpen(),
    ]);
    res.json({
      date: today,
      log: log ? { title: log.content.title, notes: log.content.notes } : null,
      todos: todos.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate })),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/log', async (req, res) => {
  try {
    const { date, title, notes } = req.body ?? {};
    const { logUseCase } = compose();
    const result = await logUseCase.upsert({
      date: date ?? todayLogDate(),
      title: title ?? '',
      notes: notes ?? '',
    });
    res.json({ created: result.created, date: result.date });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/todos', async (_req, res) => {
  try {
    const { todosUseCase } = compose();
    const list = await todosUseCase.listOpen();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Journal UI: http://localhost:${port}`);
  console.log('  GET /today  – today summary');
  console.log('  POST /log   – upsert log (body: { date?, title?, notes? })');
  console.log('  GET /todos  – list open TODOs');
});
