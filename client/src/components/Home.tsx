import { useEffect, useState } from 'react';
import { api } from '../api';
import { TopicInfo } from '../types';

export default function Home({ onStart }: { onStart: (id: string) => void }) {
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [count, setCount] = useState(0);
  const [scope, setScope] = useState('All');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.topics().then(r => { setTopics(r.topics); setCount(r.questionCount); })
      .catch(() => setError('Cannot reach the API. Is the server running on port 4000?'));
  }, []);

  const start = async () => {
    setBusy(true);
    try { onStart((await api.start(scope, 10, 300)).sessionId); }
    catch { setError('Could not start the quiz.'); setBusy(false); }
  };

  return (
    <section className="card">
      <h2>Adaptive CS Quiz</h2>
      <p>10 questions · 5 minutes · difficulty adapts to you. Answer two in a row correctly to level up; one miss drops you a level.</p>
      <label>Choose a subject</label>
      <div className="chips">
        {['All', ...topics.map(t => t.name)].map(t => (
          <button key={t} className={`chip ${scope === t ? 'on' : ''}`} onClick={() => setScope(t)}>
            {t === 'All' ? 'Mixed (all topics)' : t}
          </button>
        ))}
      </div>
      <button className="primary" disabled={busy || !!error} onClick={start}>Start quiz</button>
      {error && <p className="error">{error}</p>}
      <p className="muted">{count} questions in the bank</p>
    </section>
  );
}
