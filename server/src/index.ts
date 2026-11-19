import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import rawBank from './data/questions.json';
import { PublicQuestion, Question, QuizSession } from './types';
import { applyAnswer, buildReport, pickQuestion } from './engine';

const bank = rawBank as unknown as Question[];
const sessions = new Map<string, QuizSession>();
const app = express();
app.use(cors());
app.use(express.json());

const toPublic = (q: Question): PublicQuestion => ({
  id: q.id, topic: q.topic, subtopic: q.subtopic, difficulty: q.difficulty, text: q.text, options: q.options,
});
const remaining = (s: QuizSession) =>
  Math.max(0, Math.round((s.startedAt + s.durationSec * 1000 - Date.now()) / 1000));

function finish(s: QuizSession) {
  if (s.finished) return;
  s.finished = true;
  s.current = null;
  s.report = buildReport(s, bank);
}

function view(s: QuizSession) {
  if (!s.finished && remaining(s) === 0) finish(s); // server-side auto-submit on expiry
  return {
    sessionId: s.id, mode: s.mode, scope: s.scope, total: s.total,
    index: Math.min(s.history.length + 1, s.total),
    answered: s.history.length, remainingSec: remaining(s),
    difficulty: s.difficulty, score: s.score, hardStreak: s.hardStreak,
    finished: s.finished, question: s.current ? toPublic(s.current) : null,
  };
}

function createSession(o: { mode: QuizSession['mode']; scope: string; total: number; durationSec: number; focus?: string[] }) {
  const s: QuizSession = {
    id: randomUUID(), mode: o.mode, scope: o.scope, focus: o.focus ?? [],
    total: o.total, durationSec: o.durationSec, startedAt: Date.now(), questionStartedAt: Date.now(),
    current: null, difficulty: 'Medium', streak: 0, hardStreak: 0, maxHardStreak: 0, score: 0,
    asked: [], history: [], finished: false,
  };
  s.current = pickQuestion(s, bank);
  if (!s.current) finish(s);
  sessions.set(s.id, s);
  return s;
}

app.get('/api/topics', (_req, res) => {
  const map: Record<string, string[]> = {};
  for (const q of bank) (map[q.topic] ??= []).includes(q.subtopic) || map[q.topic].push(q.subtopic);
  res.json({ topics: Object.entries(map).map(([name, subtopics]) => ({ name, subtopics })), questionCount: bank.length });
});

app.post('/api/quiz/start', (req, res) => {
  const scope = String(req.body.scope ?? 'All');
  const total = Math.min(Math.max(Number(req.body.total) || 10, 3), 20);
  const durationSec = Math.min(Math.max(Number(req.body.durationSec) || 300, 60), 3600);
  res.json(view(createSession({ mode: 'adaptive', scope, total, durationSec })));
});

app.post('/api/quiz/remedial', (req, res) => {
  const focus: string[] = Array.isArray(req.body.weak) ? req.body.weak : [];
  if (!focus.length) return res.status(400).json({ error: 'No weak topics supplied' });
  res.json(view(createSession({ mode: 'remedial', scope: 'Remedial', total: 5, durationSec: 240, focus })));
});

app.get('/api/quiz/:id', (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  res.json(view(s));
});

app.post('/api/quiz/:id/answer', (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  if (!s.finished && remaining(s) === 0) finish(s);
  if (s.finished || !s.current) return res.json(view(s));

  const { questionId, selected } = req.body as { questionId: string; selected: number };
  if (questionId !== s.current.id) return res.status(409).json({ error: 'Out of sync', ...view(s) });

  const timeSpent = Math.max(0, Math.round((Date.now() - s.questionStartedAt) / 1000));
  applyAnswer(s, s.current, typeof selected === 'number' ? selected : -1, timeSpent);

  if (s.history.length >= s.total) finish(s);
  else {
    s.current = pickQuestion(s, bank);
    s.questionStartedAt = Date.now();
    if (!s.current) finish(s);
  }
  res.json(view(s));
});

app.post('/api/quiz/:id/finish', (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  finish(s);
  res.json(s.report);
});

app.get('/api/quiz/:id/report', (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  if (!s.finished) finish(s);
  res.json(s.report);
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => console.log(`QuizQuake API on http://localhost:${PORT}`));
