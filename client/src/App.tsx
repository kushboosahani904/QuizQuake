import { useState } from 'react';
import { ACTIVE_KEY } from './api';
import Home from './components/Home';
import Quiz from './components/Quiz';
import Results from './components/Results';
import History from './components/History';

type View = 'home' | 'quiz' | 'results' | 'history';

function loadActive(): string | null {
  try { return JSON.parse(sessionStorage.getItem(ACTIVE_KEY) ?? 'null')?.sessionId ?? null; } catch { return null; }
}

export default function App() {
  const resumed = loadActive();
  const [sessionId, setSessionId] = useState<string | null>(resumed);
  const [view, setView] = useState<View>(resumed ? 'quiz' : 'home');

  const begin = (id: string) => { setSessionId(id); setView('quiz'); };
  const done = () => { sessionStorage.removeItem(ACTIVE_KEY); setView('results'); };
  const abort = () => { sessionStorage.removeItem(ACTIVE_KEY); setSessionId(null); setView('home'); };

  return (
    <div className="app">
      <header className="nav">
        <h1 onClick={() => view !== 'quiz' && setView('home')}>⚡ QuizQuake <small>BrainStorm Arena</small></h1>
        {view !== 'quiz' && (
          <nav>
            <button className="link" onClick={() => setView('home')}>Home</button>
            <button className="link" onClick={() => setView('history')}>History</button>
          </nav>
        )}
      </header>
      <main>
        {view === 'home' && <Home onStart={begin} />}
        {view === 'quiz' && sessionId && <Quiz key={sessionId} sessionId={sessionId} onFinish={done} onAbort={abort} />}
        {view === 'results' && sessionId && <Results sessionId={sessionId} onStart={begin} />}
        {view === 'history' && <History />}
      </main>
    </div>
  );
}
