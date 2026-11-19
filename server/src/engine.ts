import {
  AnswerRecord, DiagnosticReport, Difficulty, MasteryItem, Question, QuizSession,
} from './types';

export const TIERS: Difficulty[] = ['Easy', 'Medium', 'Hard'];
const BASE_POINTS: Record<Difficulty, number> = { Easy: 10, Medium: 20, Hard: 30 };
const WEIGHT: Record<Difficulty, number> = { Easy: 1, Medium: 2, Hard: 3 };
export const WEAK_THRESHOLD = 60;

/** Sliding-window style heuristic: 2 correct in a row to go up, 1 wrong to go down. */
export function nextDifficulty(cur: Difficulty, streak: number, correct: boolean) {
  const i = TIERS.indexOf(cur);
  if (!correct) return { difficulty: TIERS[Math.max(0, i - 1)], streak: 0 };
  const s = streak + 1;
  if (s >= 2 && i < TIERS.length - 1) return { difficulty: TIERS[i + 1], streak: 0 };
  return { difficulty: cur, streak: s };
}

const groupKey = (s: QuizSession, q: Question) =>
  s.mode === 'adaptive' && s.scope === 'All' ? q.topic : q.subtopic;

function poolFor(s: QuizSession, bank: Question[]): Question[] {
  if (s.mode === 'remedial') return bank.filter(q => s.focus.includes(q.subtopic));
  return s.scope === 'All' ? bank : bank.filter(q => q.topic === s.scope);
}

/** Round-robin over topic groups (least-asked first), then closest tier to the target difficulty. */
export function pickQuestion(s: QuizSession, bank: Question[]): Question | null {
  const full = poolFor(s, bank);
  const pool = full.filter(q => !s.asked.includes(q.id));
  if (!pool.length) return null;

  const counts = new Map<string, number>();
  for (const id of s.asked) {
    const q = bank.find(b => b.id === id);
    if (q) counts.set(groupKey(s, q), (counts.get(groupKey(s, q)) ?? 0) + 1);
  }
  const groups = [...new Set(full.map(q => groupKey(s, q)))];
  groups.sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0) || Math.random() - 0.5);

  const want = TIERS.indexOf(s.difficulty);
  const dist = (q: Question) => Math.abs(TIERS.indexOf(q.difficulty) - want);
  for (const g of groups) {
    const cands = pool.filter(q => groupKey(s, q) === g);
    if (!cands.length) continue;
    cands.sort((a, b) => dist(a) - dist(b) || Math.random() - 0.5);
    return cands[0];
  }
  return null;
}

/** Scores the answer, updates tier/streaks and returns the record. */
export function applyAnswer(s: QuizSession, q: Question, selected: number, timeSpent: number): AnswerRecord {
  const correct = selected === q.answer;
  let points = 0;
  if (correct) {
    points = BASE_POINTS[q.difficulty];
    if (q.difficulty === 'Hard') {
      s.hardStreak += 1;
      points += 10 * (s.hardStreak - 1); // streak multiplier bonus
      s.maxHardStreak = Math.max(s.maxHardStreak, s.hardStreak);
    }
  } else {
    s.hardStreak = 0;
  }
  s.score += points;
  const next = nextDifficulty(s.difficulty, s.streak, correct);
  s.difficulty = next.difficulty;
  s.streak = next.streak;
  const rec: AnswerRecord = { questionId: q.id, selected, correct, timeSpent, points, difficulty: q.difficulty };
  s.history.push(rec);
  s.asked.push(q.id);
  return rec;
}

// ---------- Diagnostics ----------
function hash(str: string) {
  let h = 7;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 100003;
  return h;
}
const cohortFor = (label: string) => 50 + (hash(label) % 26); // simulated batch average 50–75%

function erf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
const normalCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

function mastery(s: QuizSession, bank: Question[], key: (q: Question) => string): MasteryItem[] {
  const m = new Map<string, { c: number; t: number; wc: number; wt: number }>();
  for (const r of s.history) {
    const q = bank.find(b => b.id === r.questionId)!;
    const k = key(q);
    const e = m.get(k) ?? { c: 0, t: 0, wc: 0, wt: 0 };
    e.t += 1; e.wt += WEIGHT[q.difficulty];
    if (r.correct) { e.c += 1; e.wc += WEIGHT[q.difficulty]; }
    m.set(k, e);
  }
  return [...m.entries()].map(([label, e]) => ({
    label, correct: e.c, total: e.t,
    percent: Math.round((e.wc / e.wt) * 100),
    cohortPercent: cohortFor(label),
  }));
}

export function buildReport(s: QuizSession, bank: Question[]): DiagnosticReport {
  const answered = s.history.length;
  const correct = s.history.filter(r => r.correct).length;
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
  const byTopicMode = s.mode === 'adaptive' && s.scope === 'All';
  const radar = mastery(s, bank, q => (byTopicMode ? q.topic : q.subtopic));
  const bySubtopic = mastery(s, bank, q => q.subtopic);
  const weak = bySubtopic.filter(i => i.percent < WEAK_THRESHOLD).sort((a, b) => a.percent - b.percent).map(i => i.label);
  const cohortMean = 62;
  const percentile = Math.round(normalCdf((accuracy - cohortMean) / 15) * 100);

  return {
    sessionId: s.id, scope: s.scope, mode: s.mode, answered, correct, accuracy,
    score: s.score, maxHardStreak: s.maxHardStreak,
    totalTimeSec: s.history.reduce((a, r) => a + r.timeSpent, 0),
    radarLevel: byTopicMode ? 'topic' : 'subtopic',
    radar, bySubtopic, weak,
    difficultyPath: s.history.map(r => r.difficulty),
    percentile, cohortMean,
    review: s.history.map(r => {
      const q = bank.find(b => b.id === r.questionId)!;
      return {
        question: q.text, topic: q.topic, subtopic: q.subtopic, difficulty: q.difficulty,
        options: q.options, selected: r.selected, answer: q.answer, correct: r.correct,
        timeSpent: r.timeSpent, explanation: q.explanation,
      };
    }),
  };
}
