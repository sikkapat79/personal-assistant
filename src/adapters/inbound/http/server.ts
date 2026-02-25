/**
 * Optional minimal local HTTP UI (Phase 7).
 * Same use cases as CLI; run: bun run ui → http://localhost:3000
 * Intended for localhost only; do not expose to the network without adding authentication.
 */
import express from 'express';
import { compose } from '../../../composition';
import { todayLogDate } from '../../../domain/value-objects/log-date';

const app = express();
app.use(express.json());

const GENERIC_ERROR = 'Internal error';

function handleError(err: unknown, res: express.Response): void {
  console.error(err);
  res.status(500).json({ error: GENERIC_ERROR });
}

app.get('/today', async (_req, res) => {
  try {
    const composition = await compose();
    const { logs, todosUseCase } = composition;
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
    handleError(err, res);
  }
});

app.post('/log', async (req, res) => {
  try {
    const body = req.body ?? {};
    const dateRaw = body.date;
    const titleRaw = body.title;
    const notesRaw = body.notes;
    const date =
      dateRaw != null ? String(dateRaw) : todayLogDate();
    const title = titleRaw != null ? String(titleRaw) : '';
    const notes = notesRaw != null ? String(notesRaw) : '';
    const composition = await compose();
    const { logUseCase } = composition;
    const result = await logUseCase.upsert({ date, title, notes });
    res.json({ created: result.created, date: result.date });
  } catch (err) {
    handleError(err, res);
  }
});

app.get('/todos', async (_req, res) => {
  try {
    const composition = await compose();
    const { todosUseCase } = composition;
    const list = await todosUseCase.listOpen();
    res.json(list);
  } catch (err) {
    handleError(err, res);
  }
});

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST ?? '127.0.0.1';
app.listen(port, host, () => {
  console.log(`Journal UI: http://${host}:${port}`);
  console.log('  GET /today  – today summary');
  console.log('  POST /log   – upsert log (body: { date?, title?, notes? })');
  console.log('  GET /todos  – list open TODOs');
});
