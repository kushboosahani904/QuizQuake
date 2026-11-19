import { useEffect, useState } from 'react';
import { Radar } from 'react-chartjs-2';
import { api, HISTORY_KEY } from '../api';
import { DiagnosticReport, HistoryEntry } from '../types';

function saveHistory(r: DiagnosticReport) {
  try {
    const list: HistoryEntry[] = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    if (list.some(h => h.id === r.sessionId)) return;
    list.push({
      id: r.sessionId, date: new Date().toISOString(), scope: r.mode === 'remedial' ? 'Remedial drill' : r.scope,
      mode: r.mode, accuracy: r.accuracy, score: r.score, percentile: r.percentile, weak: r.weak,
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(-50)));
  } catch { /* storage unavailable */ }
}

export default function Results({ sessionId, onStart }: { sessionId: string; onStart: (id: string) => void }) {
  const [r, setR] = useState<DiagnosticReport | null>(null);

  useEffect(() => { api.report(sessionId).then(rep => { setR(rep); saveHistory(rep); }); }, [sessionId]);
  if (!r) return <p className="muted">Building your diagnostic…</p>;

  const radarData = {
    labels: r.radar.map(i => i.label),
    datasets: [
      { label: 'You', data: r.radar.map(i => i.percent), backgroundColor: 'rgba(99,102,241,.25)', borderColor: '#6366f1', pointBackgroundColor: '#6366f1' },
      { label: 'Batch average (simulated)', data: r.radar.map(i => i.cohortPercent), backgroundColor: 'rgba(148,163,184,.15)', borderColor: '#94a3b8', borderDash: [5, 5], pointRadius: 2 },
    ],
  };

  return (
    <>
      <section className="card">
        <h2>Diagnostic report <small>{r.mode === 'remedial' ? 'Remedial drill' : r.scope}</small></h2>
        <div className="stats">
          <div><b>{r.accuracy}%</b><span>Accuracy ({r.correct}/{r.answered})</span></div>
          <div><b>{r.score}</b><span>Points</span></div>
          <div><b>{r.percentile}th</b><span>Percentile vs batch</span></div>
          <div><b>{r.totalTimeSec}s</b><span>Time on questions</span></div>
          {r.maxHardStreak >= 2 && <div><b>🔥 ×{r.maxHardStreak}</b><span>Best Hard streak</span></div>}
        </div>
        <p className="muted">Difficulty path: {r.difficultyPath.map((d, i) => <span key={i} className={`dot ${d}`} title={d} />)}</p>
      </section>

      <section className="card">
        <h3>Mastery radar ({r.radarLevel === 'topic' ? 'by topic' : 'by subtopic'})</h3>
        {r.radar.length >= 3 ? (
          <div className="radar">
            <Radar data={radarData} options={{ scales: { r: { min: 0, max: 100, ticks: { stepSize: 25 } } }, maintainAspectRatio: true }} />
          </div>
        ) : (
          <ul>{r.radar.map(i => <li key={i.label}>{i.label}: {i.percent}%</li>)}</ul>
        )}
        {r.weak.length > 0 ? (
          <>
            <p><b>Weak areas:</b> {r.weak.join(', ')}</p>
            <button className="primary" onClick={async () => onStart((await api.remedial(r.weak)).sessionId)}>
              Start 5-question remedial drill
            </button>
          </>
        ) : <p className="good">No weak areas detected. Nice work!</p>}
        <button className="secondary noprint" onClick={() => window.print()}>Export PDF report</button>
      </section>

      <section className="card">
        <h3>Solution review</h3>
        {r.review.map((q, i) => (
          <div key={i} className={`review ${q.correct ? 'ok' : 'bad'}`}>
            <div className="quiz-top">
              <b>Q{i + 1}</b><span className={`badge ${q.difficulty}`}>{q.difficulty}</span>
              <span className="muted">{q.topic} · {q.subtopic}</span><span className="spacer" />
              <span className="muted">{q.timeSpent}s</span>
            </div>
            <p>{q.question}</p>
            <ul className="opts">
              {q.options.map((o, j) => (
                <li key={j} className={j === q.answer ? 'right' : j === q.selected ? 'wrong' : ''}>
                  {o}{j === q.answer ? ' ✓' : j === q.selected ? ' ✗ (your answer)' : ''}
                </li>
              ))}
            </ul>
            <p className="explain">💡 {q.explanation}</p>
          </div>
        ))}
      </section>
    </>
  );
}
