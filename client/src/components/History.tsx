import { Line } from 'react-chartjs-2';
import { HISTORY_KEY } from '../api';
import { HistoryEntry } from '../types';

export default function History() {
  let list: HistoryEntry[] = [];
  try { list = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); } catch { /* ignore */ }
  if (!list.length) return <section className="card"><h2>Attempt history</h2><p className="muted">No attempts yet. Take a quiz first!</p></section>;

  const data = {
    labels: list.map((h, i) => `#${i + 1}`),
    datasets: [
      { label: 'Accuracy %', data: list.map(h => h.accuracy), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,.2)', tension: 0.3, fill: true },
      { label: 'Percentile', data: list.map(h => h.percentile), borderColor: '#10b981', tension: 0.3 },
    ],
  };
  return (
    <section className="card">
      <h2>Attempt history</h2>
      <Line data={data} options={{ scales: { y: { min: 0, max: 100 } } }} />
      <table>
        <thead><tr><th>#</th><th>Date</th><th>Scope</th><th>Accuracy</th><th>Points</th><th>Weak areas</th></tr></thead>
        <tbody>
          {[...list].reverse().map((h, i) => (
            <tr key={h.id}>
              <td>{list.length - i}</td><td>{new Date(h.date).toLocaleString()}</td><td>{h.scope}</td>
              <td>{h.accuracy}%</td><td>{h.score}</td><td>{h.weak.join(', ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="secondary" onClick={() => { localStorage.removeItem(HISTORY_KEY); location.reload(); }}>Clear history</button>
    </section>
  );
}
