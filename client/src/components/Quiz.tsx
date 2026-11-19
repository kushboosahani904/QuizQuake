import { useEffect, useRef, useState } from 'react';
import { ACTIVE_KEY, api } from '../api';
import { QuizState } from '../types';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function Quiz({ sessionId, onFinish, onAbort }: {
  sessionId: string; onFinish: () => void; onAbort: () => void;
}) {
  const [state, setState] = useState<QuizState | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const endsAt = useRef(0);
  const finishing = useRef(false);

  const apply = (s: QuizState) => {
    endsAt.current = Date.now() + s.remainingSec * 1000;
    // Refresh protection: persist session id, question index and deadline on every transition
    sessionStorage.setItem(ACTIVE_KEY, JSON.stringify({ sessionId, index: s.index, endsAt: endsAt.current }));
    setState(s);
    setSelected(null);
    if (s.finished) onFinish();
  };

  // load / resume (also runs after a page refresh)
  useEffect(() => { api.state(sessionId).then(apply).catch(onAbort); /* eslint-disable-next-line */ }, [sessionId]);

  // countdown; auto-submit on expiry
  useEffect(() => {
    const t = setInterval(() => {
      if (!endsAt.current) return;
      const l = Math.max(0, Math.round((endsAt.current - Date.now()) / 1000));
      setLeft(l);
      if (l === 0 && !finishing.current) {
        finishing.current = true;
        api.finish(sessionId).then(onFinish).catch(onAbort);
      }
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [sessionId]);

  const submit = async () => {
    if (!state?.question || selected === null || busy) return;
    setBusy(true);
    try { apply(await api.answer(sessionId, state.question.id, selected)); }
    catch { onAbort(); }
    finally { setBusy(false); }
  };

  if (!state || !state.question) return <p className="muted">Loading…</p>;
  const q = state.question;
  const pct = ((state.index - 1) / state.total) * 100;

  return (
    <section className="card">
      <div className="quiz-top">
        <span className={`badge ${q.difficulty}`}>{q.difficulty}</span>
        <span className="muted">{q.topic} · {q.subtopic}</span>
        {state.hardStreak >= 2 && <span className="badge streak">🔥 Hard streak ×{state.hardStreak}</span>}
        <span className="spacer" />
        <span className="score">★ {state.score}</span>
        <span className={`timer ${left <= 30 ? 'low' : ''}`}>⏱ {fmt(left)}</span>
      </div>
      <div className="progress"><div style={{ width: `${pct}%` }} /></div>
      <p className="muted">Question {state.index} of {state.total}</p>
      <h3>{q.text}</h3>
      <div className="options">
        {q.options.map((o, i) => (
          <label key={i} className={`option ${selected === i ? 'sel' : ''}`}>
            <input type="radio" name="opt" checked={selected === i} onChange={() => setSelected(i)} />
            {o}
          </label>
        ))}
      </div>
      <button className="primary" disabled={selected === null || busy} onClick={submit}>
        {state.index === state.total ? 'Finish' : 'Submit & next'}
      </button>
    </section>
  );
}
