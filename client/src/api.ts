import { DiagnosticReport, QuizState, TopicInfo } from './types';

async function call<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body === undefined ? undefined : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export const api = {
  topics: () => call<{ topics: TopicInfo[]; questionCount: number }>('/api/topics'),
  start: (scope: string, total: number, durationSec: number) =>
    call<QuizState>('/api/quiz/start', { scope, total, durationSec }),
  remedial: (weak: string[]) => call<QuizState>('/api/quiz/remedial', { weak }),
  state: (id: string) => call<QuizState>(`/api/quiz/${id}`),
  answer: (id: string, questionId: string, selected: number) =>
    call<QuizState>(`/api/quiz/${id}/answer`, { questionId, selected }),
  finish: (id: string) => call<DiagnosticReport>(`/api/quiz/${id}/finish`, {}),
  report: (id: string) => call<DiagnosticReport>(`/api/quiz/${id}/report`),
};

// ---- storage helpers ----
export const ACTIVE_KEY = 'quizquake.active';      // sessionStorage: survives refresh, not tab close
export const HISTORY_KEY = 'quizquake.history';    // localStorage: attempt history
